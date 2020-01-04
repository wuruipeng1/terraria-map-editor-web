const secrets = require("../secrets.js");

module.exports = {
    port: 3000,
    domain: "terraria-map-editor.eu",
    cwd: "/var/express/",
    db: {
        host: "localhost",
        user: "root",
        password: secrets.dbRootPass,
        database: "twe"
    }
};