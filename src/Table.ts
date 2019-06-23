import { MysqlError, Pool } from 'mysql';
import { AbstractOperator } from 'operator/AbstractOperator';

type IWhere<T> = { [P in keyof T]?: AbstractOperator };
type IValues<T> = { [P in keyof T]?: string | number };
type IInsert<T> = { [P in keyof T]?: string | number };

export class Table<T> {
    protected tableName = '';

    private columns: string[];
    private whereCondition: IWhere<T>;
    protected log = true;

    protected pool: Pool;

    constructor() {
    }

    public select(columns: string[] = ['*']) {
        this.columns = columns;

        return this;
    }

    public where(where: IWhere<T> = null) {
        this.whereCondition = where;

        return this;
    }

    private getWhereQuery() {
        const w = this.whereCondition ? Object.keys(this.whereCondition).map(key => {
            return `\`${key}\` ${(this.whereCondition[key] as AbstractOperator).getWhere()}`;
        }) : [];

        if (w.length > 0) {
            return ` WHERE ${w.join(" AND ")}`;
        }

        return '';
    }

    public async getFindQuery() {
        const c = this.columns.map(column => `\`${column}\``);
        let query = `SELECT ${c.join(", ")} FROM \`${await this.getTableName()}\``;

        query += this.getWhereQuery();
        query += `;`;

        return query;
    }

    public async getUpdateQuery(values: IValues<T>) {
        const s = Object.keys(values).map(key => {
            return `\`${key}\` = "${values[key]}"`;
        });
        let query = `UPDATE \`${await this.getTableName()}\` SET ${s.join(', ')}`;

        query += this.getWhereQuery();
        query += `;`;

        return query;
    }

    public async getDeleteQuery() {
        let query = `DELETE FROM \`${await this.getTableName()}\``;
        query += this.getWhereQuery();
        query += `;`;

        return query;
    }

    public async getInsertQuery(values: Array<IInsert<T>>) {
        const columns = [];
        const valuesArray = [];
        values.forEach(value => {
            const values = [];
            Object.keys(value)
                .forEach(key => {
                    if (!columns.includes(key)) {
                        columns.push(key);
                    }
                    values.push(`"${value[key]}"`);
                });
            valuesArray.push(`(${values.join(', ')})`);
        });


        const c = columns.map(column => `\`${column}\``).join(', ');
        let query = `INSERT INTO \`${await this.getTableName()}\` (${c}) VALUES ${valuesArray.join(', ')}`;
        query += this.getWhereQuery();
        query += `;`;

        return query;
    }

    public async find(): Promise<T[]> {
        const query = await this.getFindQuery();

        return this.query(query);
    }

    public async update(values: IValues<T>) {
        const query = await this.getUpdateQuery(values);

        return this.query<T>(query);
    }

    public async delete() {
        const query = await this.getDeleteQuery();

        return this.query<T>(query);
    }

    protected async query<S>(sql: string): Promise<S[]> {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, (err: MysqlError | null, results?: any) => {
                if (err) {
                    throw err;
                }
                resolve(results);
            });
        });
    }

    protected async getPrefix() {
        return '';
    }

    private async getTableName() {
        return `${await this.getPrefix()}${this.tableName}`;

    }
}
