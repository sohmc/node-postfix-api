const mysql = require('mysql2/promise');

module.exports = {
  async sendMysqlQuery(query, queryValues) {
    console.log('query: ' + query);
    console.log('placeholders: ' + JSON.stringify(queryValues));

    const dbConnection = await mysql.createConnection({
      host: process.env.POSTFIX_HOST,
      user: process.env.POSTFIX_USER,
      password: process.env.POSTFIX_PASSWORD,
      database: process.env.POSTFIX_DB,
    });

    const [queryResults, _fields] = await dbConnection.execute(query, queryValues);
    console.log('mysql Query Results: ' + JSON.stringify(queryResults));

    dbConnection.end();

    return queryResults;
  },
};
