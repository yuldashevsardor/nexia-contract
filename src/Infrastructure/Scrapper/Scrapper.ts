import { Logger } from "App/Domain/Logger/Logger";
import { Symbols } from "App/Infrastructure/Config/Dependency/Symbols";
import { inject, injectable } from "inversify";
import { ConfigValue } from "App/Infrastructure/Decorators/ConfigValue";
import { NotifySettings, ScrapperSettings } from "App/Infrastructure/Scrapper/Types";
import fetch from 'node-fetch';
import { AnyObject } from "App/Common/Types";
import { sleep } from "App/Infrastructure/Helpers/Utils";

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = String(0)

@injectable()
export class Scrapper {
    @ConfigValue<ScrapperSettings>("scrapper")
    private readonly settings!: ScrapperSettings;

    @ConfigValue<NotifySettings>("notify")
    private readonly notifySettings!: NotifySettings;

    private isRun = false;

    public constructor(
        @inject<Logger>(Symbols.Logger) private readonly logger: Logger
    ) {
    }

    public async run(): Promise<void> {
        if (this.isRun) {
            return;
        }

        this.isRun = true;
        this.logger.info("Scrapper is running with settings", this.settings);

        while (this.isRun) {
            await this.scrap();
            await sleep(this.settings.interval);
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRun) {
            return;
        }

        this.isRun = false;
        this.logger.info("Scrapper is stopped!")
    }

    private async scrap(): Promise<void> {
        let data: AnyObject[];

        try {
            data = await this.fetch();
        } catch (error) {
            this.logger.error("Error on fetch data", error);

            return;
        }

        const model = this.search(data);

        if (!model) {
            this.logger.info("sorry, model not found :(");

            return;
        }

        this.logger.info("!!!FOUND!!!");

        const modelAsString = JSON.stringify(model, null, 2);

        for (const chatId of this.notifySettings.chatIds) {
            await this.notify(`Эй йоу, просыпайся блат, я нашел тут кое что!!! И это ${model.name}`, chatId);
            await this.notify(`<code>${modelAsString.substring(0, 4000)}</code>`, chatId);
        }
    }

    private async fetch(): Promise<AnyObject[]> {
        const response = await fetch(this.settings.url, {
            method: "GET",
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            }
        });

        return await response.json();
    }

    private search(data: AnyObject[]): AnyObject | null {
        for (const model of data) {
            let modelName = model.name;

            if (!modelName) {
                continue;
            }

            modelName = modelName.trim().toLowerCase();

            for (const title of this.settings.titles) {
                if (modelName.includes(title.trim().toLowerCase())) {
                    return model;
                }
            }
        }

        return null;
    }

    private async notify(message: string, chatId: number): Promise<void> {
        try {
            const body = {
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
            };

            const response = await fetch(this.notifySettings.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            const json = await response.json();

            if (!json.ok) {
                this.logger.critical("Invalid response from Telegram Notify", {
                    body: body,
                    url: this.settings.url,
                    response: json
                })
            }
        } catch (error) {
            this.logger.error("error on notify", error);
        }
    }
}
