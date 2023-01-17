export default class OpenApiJoiPlugin {
  private serverless: Serverless;

  constructor(serverless: Serverless, options: Serverless.Options, hooks: Serverless.Hooks) {
    this.serverless = serverless;
    this.serverless.getVersion();
    // this.options = options;
    // this.commands = {};
  }
}
