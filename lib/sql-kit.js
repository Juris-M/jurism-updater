var tableSpecs = {
    translators: [
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
    styles: [
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
    bugs: [
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
    commit_hash: [
        {
            name: "repo_name",
            spec: "CHAR(64) PRIMARY KEY"
        },
        {
            name: "commit",
            spec: "CHAR(64)"
        }
    ]
}
module.exports = tableSpecs;
