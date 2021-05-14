import { GridOptions } from '@ag-grid-community/core';
import * as Httpyac from 'httpyac';
import * as vscode from 'vscode';
import { AppConfig } from './config';
import get from 'lodash/get';
import { HttpOutputProvider, HttpOutputResult, HttpOutputPriority, HttpOutputContext } from './httpBookExtensionApi';

export class GridHttpOutpoutProvider implements HttpOutputProvider {
  id = 'httpbook-grid';

  constructor(readonly config: AppConfig) {}

  getResponseOutputResult(response: Httpyac.HttpResponse, { metaData }: HttpOutputContext): HttpOutputResult | false {
    if (response?.parsedBody) {

      let rowData: Array<unknown> | false = false;
      let priority = HttpOutputPriority.Default;
      const explicitField = metaData['grid.arrayField'];
      if (explicitField) {
        const fieldValue = get(response.parsedBody, explicitField);
        if (Array.isArray(fieldValue)) {
          rowData = fieldValue;
          priority = HttpOutputPriority.High;
        }
      } else {
        if (Array.isArray(response.parsedBody)) {
          priority = HttpOutputPriority.High;
        }
        rowData = this.findArray(response.parsedBody);
      }
      if (rowData) {
        const gridOptions: GridOptions = Object.assign({}, this.config.gridOptions, {
          rowData
        });
        return {
          outputItems: new vscode.NotebookCellOutputItem(
            'x-application/httpbook-grid',
            gridOptions,
            {
              numberOfRowsForColDefRecognition: +metaData['grid.rowsForColumnDefs'] || this.config.numberOfRowsForColDefRecognition,
              columnDefs: metaData['grid.columnDefs'],
            }
          ),
          priority
        };
      }
    }
    return false;
  }

  private findArray(data: unknown): Array<unknown> | false {
    if (data) {
      if (Array.isArray(data)) {
        return data;
      }
      if (typeof data === 'object') {
        for (const [, value] of Object.entries(data as Record<string, string>)) {
          const result = this.findArray(value);
          if (result) {
            return result;
          }
        }
      }
    }
    return false;
  }
}
