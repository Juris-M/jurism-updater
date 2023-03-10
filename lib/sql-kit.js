var sqlOps = {
    assureAllTables: async () => {
        var query = require(pth.fp.connection).query;
        var sql = "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM information_schema.tables WHERE table_schema LIKE ? AND table_type LIKE ? AND table_name = ?;
        for (var key in this.tables) {
            console.log(`Checking ${key}`);
            var result = await query(sql, ["jurismdb", "base_table", key]);
            console.log(`Got result from checking ${key}`);
            if (!result.length) {
                console.log(`Creating ${key}`);
                await query(this[key].createStatement());
            }
        }
    },
    tables: {
        translators: {
            fields: [
                {
                    name: "filename",
                    spec: "VARCHAR(1024)",
                    jsonSkip: true
                },
                {
                    name: "translatorID",
                    spec: "CHAR(64) PRIMARY KEY",
                    xmlName: "id",
                    xmlType: 'attribute'
                    
                },
                {
                    name: "translatorType",
                    spec: " TINYINT NOT NULL",
                    xmlName: 'type',
                    xmlType: 'attribute'
                },
                {
                    name: "label",
                    spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
                    xmlName: 'label',
                    xmlType: 'element'
                },
                {
                    name: "creator",
                    spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
                    xmlName: "creator",
                    xmlType: "element"
                },
                {
                    name: "target",
                    spec: " VARCHAR(4096)",
                    xmlName: 'target',
                    xmlType: 'element'
                },
                {
                    name: "targetAll",
                    spec: " VARCHAR(4096)",
                    xmlName: 'targetAll',
                    xmlType: 'element'
                },
                {
                    name: "priority",
                    spec:  "INT",
                    xmlName: 'priority',
                    xmlType: 'element'
                },
                {
                    name: "lastUpdated",
                    spec: "INT NOT NULL",
                    xmlName: 'lastUpdated',
                    xmlType: 'attribute'
                },
                {
                    name: "minVersion",
                    spec: "VARCHAR(64)",
                    xmlName: 'minVersion',
                    xmlType: 'attribute'
                },
                {
                    name: "maxVersion",
                    spec: "VARCHAR(64)",
                    jsonSkip: true
                },
                {
                    name: "inRepository",
                    spec: "TINYINT",
                    force: true,
                    jsonSkip: true
                },
                {
                    name: "browserSupport",
                    spec: "VARCHAR(64)",
                    xmlName: 'browserSupport',
                    xmlType: 'attribute'
                },
                {
                    name: "displayOptions",
                    spec: "VARCHAR(1024)",
                    xmlName: 'displayOptions',
                    xmlType: 'elementObject'
                },
                {
                    name: "configOptions",
                    spec: "VARCHAR(1024)",
                    xmlName: 'configOptions',
                    xmlType: 'elementObject'
                },
                {
                    name: "code",
                    spec: "MEDIUMBLOB",
                    xmlName: 'code',
                    xmlType: 'element'
                }
            ],
            createStatement: function() {
                var sql = "CREATE TABLE translators ("
                var lst = [];
                for (var info of this.fields) {
                    lst.push(info.name + " " + info.spec);
                }
                sql += lst.join(",") + ");";
                return sql;
            },
            insertStatement: function() {
                var lst = [];
                var sql = "INSERT INTO translators VALUES (";
                for (var info of this.fields) {
                    lst.push('?');
                }
                sql += lst.join(',');
                sql += ');';
                return sql;
            },
            insertParams: function(info) {
                info = this.squashFields(info);
                var ret = [];
                for (var fieldInfo of this.fields) {
                    if (fieldInfo.force) {
                        ret.push(fieldInfo.force);
                    } else {
                        ret.push(info[fieldInfo.name] ? info[fieldInfo.name] : null);
                    }
                }
                return ret;
            },
            squashFields: function (info) {
                for (var key in info) {
                    if (info[key]) {
                        if (["displayOptions", "configOptions"].indexOf(key) > -1) {
                            info[key] = JSON.stringify(info[key]);
                        }
                    }
                }
                return info;
            }
        },
        styles: {
            fields: [
                {
                    name: "filename",
                    spec: "VARCHAR(1024)"
                },
                {
                    name: "styleID",
                    spec: "CHAR(254) PRIMARY KEY",
                    xmlName: "id",
                    xmlType: 'attribute'
                    
                },
                {
                    name: "styleType",
                    spec: " CHAR(64)",
                    xmlName: 'type',
                    xmlType: 'attribute'
                },
                {
                    name: "lastUpdated",
                    spec: "INT NOT NULL",
                    xmlName: 'lastUpdated',
                    xmlType: 'attribute'
                }
            ],
            
            createStatement: function(repoInfo) {
                var lst = [];
                for (var info of this.fields) {
                    lst.push(`${info.name} ${info.spec}`);
                }
                var fields = lst.join(",");
                var ret =  `CREATE TABLE ${repoInfo.category} (${fields})`;
                return ret;
            },
            insertParams: function(info) {
                var ret = [];
                for (var fieldInfo of this.fields) {
                    ret.push(info[fieldInfo.name]);
                }
                return ret;
            },
            
            insertStatement: function() {
                var lst = [];
                for (var info of this.fields) {
                    lst.push('?');
                }
                var sql = `INSERT INTO styles VALUES (${lst.join(",")});`;
                return sql;
            },
        },
        bugs: {
            fields: [
                {
                    name: "id",
                    spec: "CHAR(64) PRIMARY KEY"
                },
                {
                    name: "date",
                    spec: "INT"
                },
                {
                    name: "txt",
                    spec: "MEDIUMBLOB"
                }
            ],
            createStatement: function() {
                var fields = this.fields.map((o) => {
                    return `${o.name} ${o.spec}`;
                }).join(", ");
                var ret =  `CREATE TABLE ${repoInfo.category} (${fields})`;
                return ret;
            }
        }
    }
}
module.exports = sqlOps;
