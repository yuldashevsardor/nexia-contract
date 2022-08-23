import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";
import path from "path";
import { injectable } from "inversify";
import { Level, Levels } from "App/Domain/Logger/Types";
import { InvalidConfigError } from "App/Common/Errors";
import { Symbols } from "App/Infrastructure/Config/Dependency/Symbols";
import { NotifySettings, ScrapperSettings } from "App/Infrastructure/Scrapper/Types";

dotenvExpand.expand(dotenv.config());

export type Environment = "production" | "development" | "testing";

@injectable()
export class Config {
    private readonly loggerTypes = ["ConsoleLogger", "PinoLogger"];

    public readonly environment: Environment;
    public readonly isProduction: boolean;

    public readonly root: string;
    public readonly tempDir: string;

    public readonly logger: {
        default: symbol;
        levels: Array<Level>;
    };

    public readonly scrapper: ScrapperSettings;

    public readonly notify: NotifySettings;

    public constructor() {
        this.environment = Config.getEnvAsString("NODE_ENV", "development") as Environment;
        this.isProduction = this.environment === "production";

        this.root = process.cwd();
        this.tempDir = Config.getEnvAsString("TEMP_DIR", path.join(this.root, "temp"));

        const defaultLoggerKey = Config.getEnvAsString("LOGGER_DEFAULT", "") || (this.isProduction ? "PinoLogger" : "ConsoleLogger");
        const logLevels = Config.getEnvAsArray("LOGGER_LEVELS", []).map((level) => level.toUpperCase());

        if (!this.loggerTypes.includes(defaultLoggerKey)) {
            throw new InvalidConfigError({
                message: "Invalid default logger",
                payload: {
                    got: defaultLoggerKey,
                    allowed: this.loggerTypes,
                },
            });
        }

        this.logger = {
            default: Symbols[defaultLoggerKey],
            levels: [],
        };

        if (!logLevels.length) {
            if (this.isProduction) {
                this.logger.levels = [Level.WARNING, Level.ERROR, Level.CRITICAL];
            } else {
                this.logger.levels = Levels;
            }
        } else if (logLevels.includes("*") || logLevels.includes("ALL")) {
            this.logger.levels = Levels;
        } else {
            this.logger.levels = logLevels as Array<Level>;
        }

        this.scrapper = {
            url: Config.getEnvAsString("SCRAPPER_URL"),
            interval: Config.getEnvAsInteger("SCRAPPER_INTERVAL", 1000),
            titles: Config.getEnvAsArray("SCRAPPER_TITLES", ["nexia"]),
        }

        this.notify = {
            url: Config.getEnvAsString("NOTIFY_BOT_URL"),
            chatIds: Config.getEnvAsArray("NOTIFY_CHAT_ID", []).map(chat => parseInt(chat))
        }
    }

    private static getEnvAsString(name: string, defaultValue = ""): string {
        let value = process.env[name];

        if (value !== undefined) {
            value = value.trim();
        }

        if (value === null || value === undefined || value === "") {
            return defaultValue;
        }

        return value;
    }

    private static getEnvAsInteger(name: string, defaultValue: number): number {
        const value = Config.getEnvAsString(name, "");

        if (value === "") {
            return defaultValue;
        }

        return parseInt(value);
    }

    private static getEnvAsBoolean(name: string, defaultValue: boolean): boolean {
        const value = Config.getEnvAsString(name, "");

        if (value === "") {
            return defaultValue;
        }

        if (/^true$/i.test(value)) {
            return true;
        }

        if (/^false$/i.test(value)) {
            return false;
        }

        return !!parseInt(value);
    }

    private static getEnvAsArray(name: string, defaultValue: Array<string>): Array<string> {
        const value = Config.getEnvAsString(name, "");

        if (value === "") {
            return defaultValue;
        }

        return value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item !== "");
    }
}
