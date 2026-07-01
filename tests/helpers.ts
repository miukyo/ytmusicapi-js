import path from 'path';
import fs from 'fs';

export function get_resource(file: string): string {
    return path.resolve(__dirname, './', file);
}

export function get_data_path(): string {
    return path.resolve(__dirname, './data');
}

export function read_json_fixture(filePath: string): any {
    const fullPath = path.isAbsolute(filePath) ? filePath : get_resource(filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
}
