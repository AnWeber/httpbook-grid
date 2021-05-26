import { ActivationFunction, CellInfo } from 'vscode-notebook-renderer';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, render, Component } from 'preact';

import '@ag-grid-community/core/dist/styles/ag-grid.min.css';
import '@ag-grid-community/core/dist/styles/ag-theme-alpine.min.css';
import { Grid, GridOptions, ColDef, ValueFormatterParams, GetQuickFilterTextParams, ITooltipParams } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import './index.css';

export const activate: ActivationFunction = () => ({
  renderCell(_id, cell: CellInfo) {
    let dataGridMetaData: DataGridMetaData = {
      gridOptions: {}
    };
    if (isDataGridOptions(cell.metadata)) {
      dataGridMetaData = cell.metadata;
    }
    render(<DataGrid data={cell.json()} metaData={dataGridMetaData} />, cell.element);
  },
});

function isDataGridOptions(metadata: unknown): metadata is DataGridMetaData {
  const obj = metadata as Record<string, number>;
  return !!obj && !!obj.gridOptions;
}


interface DataGridMetaData {
  field?: string;
  gridOptions: GridOptions,
  numberOfRowsForColDefRecognition?: number,
  columnDefs?: string,
}


export class DataGrid extends Component<{ data: unknown, metaData: DataGridMetaData }, { grid: Grid }> {
  private ref: HTMLElement | null = null;
  async componentDidMount(): Promise<void> {
    if (this.ref && Array.isArray(this.props.data)) {
      const gridOptions: GridOptions = {
        rowData: this.props.data,
        columnDefs: this.getColumnDefs(this.props.data, this.props.metaData),
      };

      const grid = new Grid(this.ref, Object.assign(this.props.metaData.gridOptions, gridOptions), { modules: [ClientSideRowModelModule] });
      this.setState({
        grid,
      });

    }
  }

  componentWillUnmount() : void {
    this.state.grid.destroy();
  }

  onInput({ target, preventDefault }: {target: EventTarget | null, preventDefault: () => void}): void {
    if (target && target instanceof HTMLInputElement) {
      const { value } = target;
      if (this.props.metaData.gridOptions.api) {
        this.props.metaData.gridOptions.api.setQuickFilter(value);
      }
    }
    preventDefault();
  }

  render() : h.JSX.Element {
    return (
      <section>
        <div class="grid_controls">
          <input type="text" class="searchinput" placeholder="Search" onInput={this.onInput.bind(this)} label="search" />
        </div>
        <div class="ag-theme-alpine" ref={ref => {
          this.ref = ref;
        }}>
          {!!this.state.grid}
        </div>
      </section>
    );
  }

  private getColumnDefs(rowData: Array<unknown> | undefined, metaData?: DataGridMetaData): ColDef[] {
    if (metaData?.columnDefs) {
      return metaData.columnDefs.split(',').map(obj => {
        const col = obj.split('=');
        if (col.length > 1) {
          return {
            headerName: col[1].trim(),
            field: col[0].trim(),
          };
        }
        return {
          headerName: obj.trim(),
          field: obj.trim(),
        };
      });
    }
    const result: ColDef[] = [];

    const maxRows = metaData?.numberOfRowsForColDefRecognition || result.length;
    let index = 0;
    if (rowData) {
      for (const row of rowData) {
        if (index++ > maxRows) {
          break;
        }
        result.push(...this.getColDefs(row));
      }
    }
    const colDefs = result.filter((obj, index, self) => self.findIndex(col => col.field === obj.field) === index);

    colDefs.push({
      field: '_json',
      tooltipValueGetter: jsonDataFormatter,
      valueFormatter: jsonDataFormatter,
      getQuickFilterText: jsonDataFormatter,
    });
    return colDefs;
  }

  private getColDefs(obj: unknown): ColDef[] {
    const result: ColDef[] = [];
    if (typeof obj === 'object') {
      for (const [field, value] of Object.entries(obj as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          result.push({
            tooltipValueGetter: jsonFormatter,
            valueFormatter: jsonFormatter,
            getQuickFilterText: jsonFormatter,
            headerName: field,
            field,
          });
        } else if (typeof value === 'object') {
          result.push(...this.getColDefs(value).map(colDef => ({
            ...colDef,
            tooltipField: `${field}.${colDef.field}`,
            field: `${field}.${colDef.field}`,
            headerName: `${field}.${colDef.field}`,
          })));
        } else {
          const colDef: ColDef = {
            tooltipField: field,
            field,
            headerName: field,
          };
          result.push(colDef);
        }
      }
    }
    return result;
  }
}
function jsonFormatter(obj: ValueFormatterParams |GetQuickFilterTextParams | ITooltipParams) {
  return JSON.stringify(obj.value, null, 2);
}
function jsonDataFormatter(obj: ValueFormatterParams |GetQuickFilterTextParams | ITooltipParams) {
  return JSON.stringify(obj.data, null, 2);
}
