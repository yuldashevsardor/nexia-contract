export type ScrapperSettings = {
    url: string;
    interval: number;
    modelTitles: string[],
    modificationTitles: string[]
}

export type NotifySettings = {
    url: string,
    chatIds: number[]
}
