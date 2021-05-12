import * as vscode from 'vscode';
import { HttpBookApi } from './httpBookExtensionApi';
import { GridHttpOutpoutProvider } from './gridtHttpOutputProvider';
import { AppConfig, watchConfigSettings } from './config';


export function activate(context: vscode.ExtensionContext): void {
  const httpbookExtension = vscode.extensions.getExtension<HttpBookApi>('anweber.httpbook');
  if (httpbookExtension?.isActive) {
    const config: AppConfig = {};
    context.subscriptions.push(watchConfigSettings(current => Object.assign(config, current)));
    httpbookExtension.exports.registerHttpOutputProvider(new GridHttpOutpoutProvider(config));
  }
}
