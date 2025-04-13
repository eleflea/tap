const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "ap-southeast-2" }); 

exports.handler = async (event) => {
    const tableName = "CyberThreatData"; 
    const params = {
        TableName: tableName,
    };

    try {
        const command = new ScanCommand(params);
        const data = await client.send(command);

        const threatContents = []

        const keywords = ['ransomware']
        const results = []

        // Extract and collect all S values from ThreatCategories
        const threatCategories = data.Items.map(item => {
            threatContents.push(item.RawContent.S)

            const categories = item.ThreatCategories.M;
            const allValues = [];
            
            // Loop through each category and extract "S" values
            Object.keys(categories).forEach(key => {
                const valuesList = categories[key].L;
                const sValues = valuesList.map(entry => entry.S);
                allValues.push(sValues);
            });

            return allValues;
        });

        console.log(threatContents)

        threatCategories.forEach((threats, index) => {
            threats.forEach((threat, threatIndex) => {
                threat.forEach((keyword, keywordIndex) => {
                    if (keywords.includes(keyword)) {
                        results.push(threatContents[index])
                    }  
                })
            })
        });

        return {
            statusCode: 200,
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error("Error reading from DynamoDB", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error reading data", error: error.message }),
        };
    }
};