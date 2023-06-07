export class PreviewUrls {
  private _urls: string[] = []

  public addUrl(url: string) {
    this._urls.push(url)
  }

  public getUrls(): string[] {
    return this._urls
  }
}
