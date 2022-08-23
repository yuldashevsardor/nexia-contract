import "reflect-metadata";
import { container } from "App/Infrastructure/Config/Dependency/Container";
import { Symbols } from "App/Infrastructure/Config/Dependency/Symbols";
import { Scrapper } from "App/Infrastructure/Scrapper/Scrapper";

let scrapper: Scrapper | null = null;

async function bootstrap(): Promise<void> {
    await container.load();
    scrapper = container.get<Scrapper>(Symbols.Scrapper);
    await scrapper.run();
}

async function stop(): Promise<void> {
    if (scrapper) {
        await scrapper.stop();
    }

    await container.close();
}

// Enable graceful stop
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

bootstrap().catch(console.error);
