import { provide, inject } from 'midway';
import { LoDashStatic } from 'lodash';
import * as fs from 'fs';
import * as excel from 'exceljs';
import * as dateFormat from 'dateformat';
import * as archiver from 'archiver';
import * as archiverZipEncrypted from 'archiver-zip-encrypted';

export interface IExcelContent {
  sheets: ISheetContent[];
  /// 这里是为了补充公式等信息, 也可以直接使用 ISheetContent[]
}
interface ISheetContent {
  name?: string;
  data: any[];
}
export interface IExcelOptions {
  /**
   * 在文件名前添加时间后缀
   */
  appendTimeFormatToName?: boolean;
  appendTimeFormat?: string | 'yyyymmdd' | 'yyyy-mm-dd';
}
export interface IExcelArchiver {
  /**
   * 是否启用压缩, 目前只支持 zip
   */
  archiver?: boolean;
  /**
   * 是否设置压缩密码
   */
  password?: string;
  /**
   * 是否设置新的路径, 如不设置则和 Excel 路径保持相同
   */
  zipPath?: string;
}

export interface IExcelUtils extends ExcelUtils {}

@provide()
export class ExcelUtils {
  @inject()
  _: LoDashStatic;

  async downloadFile(
    filePath: string,
    fileName: string,
    content?: IExcelContent,
    options?: IExcelArchiver & IExcelOptions
  ) {
    if (!filePath || !fileName || !fileName.endsWith('.xlsx')) {
      return;
    }
    if (!filePath.endsWith('/')) {
      filePath = filePath + '/';
    }

    // create excel workbook
    const workbook = new excel.Workbook();
    workbook.creator = 'Justin.xie';
    workbook.lastModifiedBy = 'Justin.xie';
    workbook.created = new Date();
    workbook.modified = new Date();

    // fill the content into the workbook
    let sheetIndex = 1;
    if (content && content.sheets) {
      for (const item of content.sheets) {
        if (!item.data || item.data.length === 0) {
          continue;
        }

        const sheetName = item.name || 'sheet' + sheetIndex;
        const columnArray = [];
        if (item.data[0] instanceof Array) {
          columnArray.push(...Object.getOwnPropertyNames(item.data[0][0]));
          if (item.data[0][0] instanceof Array) {
            throw new Error('最多支持一层数组对象');
          }
        } else if (item.data[0] instanceof Object) {
          columnArray.push(...Object.getOwnPropertyNames(item.data[0]));
        } else {
          throw new Error('只能为对象或者是对象集合');
        }

        console.log(columnArray);
        const sheet = workbook.addWorksheet(sheetName);
        sheet.getRow(1).values = [
          sheetName,
          ...Array(columnArray.length - 1).fill('')
        ];
        // merge the title
        sheet.mergeCells(`A1:${this.createCellPos(columnArray.length - 1)}1`);
        sheet.getRow(2).values = columnArray;

        // set the columns(like the table headers)
        sheet.columns = columnArray.map(name => {
          return {
            key: name,
            width: 25
          };
        });

        // fill the content
        for (const data of item.data) {
          if (data instanceof Array) {
            data.forEach(x => sheet.addRow(x));
          } else {
            sheet.addRow(data);
          }
        }

        this.setSheetStyle(sheet);

        sheetIndex++;
      }
    }

    // download file
    if (options && options.appendTimeFormatToName && options.appendTimeFormat) {
      fileName = dateFormat(new Date(), 'yyyymmdd') + fileName;
    }
    fs.existsSync(filePath + fileName) && fs.unlinkSync(filePath + fileName);
    await workbook.xlsx.writeFile(filePath + fileName);

    if (options && options.archiver) {
      await this.archiverAndEncrypteFile(
        filePath,
        fileName,
        options && (options as IExcelArchiver)
      );
    }
  }
  /**
   * Convert from numeric position to letter for column names in Excel
   * @param  {int} number Column number
   * @return {string} Column letter(s) name
   */
  private createCellPos(number) {
    const ordA = 'A'.charCodeAt(0);
    const ordZ = 'Z'.charCodeAt(0);
    const len = ordZ - ordA + 1;

    let s = '';
    while (number >= 0) {
      s = String.fromCharCode((number % len) + ordA) + s;
      number = Math.floor(number / len) - 1;
    }

    return s;
  }

  /**
   * 设置 Sheet 样式
   */
  private setSheetStyle(sheet: excel.Worksheet) {
    sheet.getRow(1).getCell(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    sheet.getRow(1).getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4169E1' }
    };
    sheet.getRow(1).getCell(1).font = {
      color: { argb: 'FFFFFF' },
      name: 'Calibri',
      size: 12
    };
    sheet.getRow(1).getCell(1).border = {
      top: { color: { argb: '000000' }, style: 'medium' },
      left: { color: { argb: '000000' }, style: 'medium' },
      right: { color: { argb: '000000' }, style: 'medium' },
      bottom: { color: { argb: '000000' }, style: 'medium' }
    };
    sheet.getRow(1).height = 25;

    for (let index = 1; index <= sheet.columns.length; index++) {
      sheet.getRow(2).getCell(index).alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      sheet.getRow(2).getCell(index).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4169E1' }
      };
      sheet.getRow(2).getCell(index).font = {
        color: { argb: 'FFFFFF' },
        name: 'Calibri',
        size: 12
      };
      sheet.getRow(2).getCell(index).border = {
        top: { color: { argb: '000000' }, style: 'medium' },
        left: { color: { argb: '000000' }, style: 'medium' },
        right: { color: { argb: '000000' }, style: 'medium' },
        bottom: { color: { argb: '000000' }, style: 'medium' }
      };

      sheet.getRow(2).height = 25;
    }

    // 添加密码
    // await sheet.protect('123456', null);
  }

  private async archiverAndEncrypteFile(
    filePath: string,
    fileName: string,
    options?: IExcelArchiver
  ): Promise<string> {
    const zipPath =
      (options && options.zipPath) || `${filePath}${fileName}.zip`;

    fs.existsSync(zipPath) && fs.unlinkSync(zipPath);
    const output = fs.createWriteStream(zipPath);

    // 生成archiver对象，打包类型为zip
    let archive;
    if (options && options.password) {
      // register format for archiver
      try {
        archiver.registerFormat('zip-encrypted', archiverZipEncrypted);
      } catch (error) {}

      archive = archiver.create('zip-encrypted', {
        zlib: {
          level: 8 // 压缩等级
        },
        encryptionMethod: 'aes256', // 加密方法
        password: options.password // 解压密码
      });
    } else {
      archive = archiver('zip', {
        zlib: { level: 8 }
      });
    }

    // 对文件压缩,
    archive.file(`${filePath}${fileName}`, { name: fileName }); // 第一个源文件, 第二个压缩文件中显示的名称
    // 对文件夹进行压缩
    // archive.directory(filePath, false);

    archive.pipe(output); // 将打包对象与输出流关联
    // 监听所有archive数据都写完
    await output.on('close', function() {
      console.log('压缩完成', archive.pointer() / 1024 / 1024 + 'M');
    });
    await archive.on('error', function(err) {
      console.log('压缩失败!');
      throw err;
    });
    // 打包
    archive.finalize();

    return zipPath;
  }
}
