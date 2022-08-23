import "reflect-metadata";
import { Container as InversifyContainer } from "inversify";
import { Symbols } from "App/Infrastructure/Config/Dependency/Symbols";
import { Config } from "App/Infrastructure/Config/Config";
import { ConsoleLogger } from "App/Infrastructure/Logger/ConsoleLogger";
import { Logger } from "App/Domain/Logger/Logger";
import { AbstractLogger } from "App/Infrastructure/Logger/AbstractLogger";
import { PinoLogger } from "App/Infrastructure/Logger/PinoLogger";
import { asyncLocalStorage } from "App/Infrastructure/Config/AsyncLocalStorage";
import { Scrapper } from "App/Infrastructure/Scrapper/Scrapper";

class Container extends InversifyContainer {
    private isLoaded = false;

    public async load(): Promise<void> {
        if (this.isLoaded) {
            return;
        }

        await this.loadModules();
        await this.loadServices();
        await this.loadInfrastructure();

        this.isLoaded = true;
    }

    public async close(): Promise<void> {
        if (!this.isLoaded) {
            return;
        }
    }

    private async loadModules(): Promise<void> {
        this.bind<Scrapper>(Symbols.Scrapper).to(Scrapper).inSingletonScope();
    }

    private async loadServices(): Promise<void> {
    }

    private async loadInfrastructure(): Promise<void> {
        this.bind<Config>(Symbols.Config).to(Config).inSingletonScope();

        await this.loadInfrastructureLogger();
    }

    private async loadInfrastructureLogger(): Promise<void> {
        this.bind<ConsoleLogger>(Symbols.ConsoleLogger).to(ConsoleLogger).inSingletonScope();
        this.bind<PinoLogger>(Symbols.PinoLogger).to(PinoLogger).inSingletonScope();

        const config = this.get<Config>(Symbols.Config);
        const consoleLogger = this.get<ConsoleLogger>(Symbols.ConsoleLogger);
        const pinoLogger = this.get<PinoLogger>(Symbols.PinoLogger);

        consoleLogger.setLevels(config.logger.levels);
        pinoLogger.setLevels(config.logger.levels);

        this.rebind<Logger>(Symbols.ConsoleLogger).toConstantValue(consoleLogger);
        this.rebind<Logger>(Symbols.PinoLogger).toConstantValue(
            new Proxy(pinoLogger, {
                get(target, property, receiver): unknown {
                    target = asyncLocalStorage?.getStore()?.get("logger") || target;
                    target.setLevels(config.logger.levels);

                    return Reflect.get(target, property, receiver);
                },
            }),
        );

        const defaultLogger = this.get<Logger>(config.logger.default);

        if (defaultLogger instanceof AbstractLogger) {
            defaultLogger.setLevels(config.logger.levels);
        }

        this.bind<Logger>(Symbols.Logger).toConstantValue(defaultLogger);
    }
}

export const container = new Container();
