'use strict';

const request = require('superagent');

module.exports = class Neo4jClient {
	/**
	 *
	 * @param {string} serviceRoot (eg. https://127.0.0.1:7474)
	 * @param {string} username
	 * @param {string} password
	 */
	constructor(serviceRoot, username, password) {
		this.serviceRoot = serviceRoot;
		this.authToken = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
	}

	/**
	 * Runs one or more cypher queries
	 * @param {Array<object>} statements
	 * @returns {Promise<array>} the body
	 */
	query(statements) {
		const body = {
			statements: statements.map(s => {
				return {
					statement: s.statement,
					parameters: s.parameters,
					resultDataContents: [
						//'row'
					],
					includeStats: false
				};
			})
		};

		return new Promise((resolve, reject) => {
			request
				.post(`${this.serviceRoot}/db/data/transaction/commit`)
				.send(body)
				.set('Authorization', `Bearer ${this.authToken}`)
				.set('Content-Type', 'application/json')
				.end((err, res) => {
					if (err) {
						reject(err);
					} else if (res.body.errors && res.body.errors.length > 0) {
						reject({ neo4j: { errors: res.body.errors, statements } });
					} else {
						const results = res.body.results;

						if (results) {
							resolve(this.mapResults(results));
						} else {
							reject(res.body);
						}
					}
				});
		});
	}

	mapResults(results) {
		return results.map(result => {
			const rows = result.data.map(rowData => {
				let rowObject = {};

				result.columns.forEach((columnName, i) => {
					rowObject[columnName] = rowData.row[i];
				});

				return rowObject;
			});

			return rows;
		});
	}
};
