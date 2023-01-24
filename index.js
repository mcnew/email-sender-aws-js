const handlerbars = require('handlebars');

const pkg = 'aws-sdk';
const AWS = require(`${pkg}`);
const codecommit = new AWS.CodeCommit({
    apiVersion: '2015-04-13'
});
const sqs = new AWS.SQS({
    apiVersion: '2012-11-05'
});

const BRANCH = process.env.BRANCH;
const REPOSITORY = process.env.REPOSITORY;
const DISABLE_CACHE = process.env.DISABLE_CACHE;
const SOURCE_EMAIL = process.env.SOURCE_EMAIL;

const _TEMPLATES = {};
let configured;

function getTextFile(file) {
    let params = {
        commitSpecifier: BRANCH,
        filePath: file,
        repositoryName: REPOSITORY
    };

    return codecommit.getFile(params).promise().then(resp => resp.fileContent.toString('utf8'));
}

function getGlobalConfiguration() {
    return getTextFile('configuration.json').then(text => JSON.parse(text));
}

function _getTemplate(name) {
    return getTextFile(`email/${name}.hbs`).then(text => {
        return handlerbars.compile(text);
    });
}

function getTemplate(name) {
    if (DISABLE_CACHE === 'true') {
        return _getTemplate(name);
    } else {
        let template = _TEMPLATES[name];

        if (template == undefined) {
            console.info(`compiling1 ... ${name}`);
            return _getTemplate(name).then((template1) => {
                _TEMPLATES[name] = template1;

                return template1;
            });
        } else {
            console.info('cache1 ...');
            return Promise.resolve(template);
        }
    }
}

async function _loadPartials(partials, ndx) {
    if (partials.length === ndx) {
        return [];
    } else {
        let partial = partials[ndx];
        let original = partial.source;
        if (original.startsWith('/') || original.startsWith('.')) {
            let next = await _loadPartials(partials, ndx + 1);
            next.unshift({
                partial: partial.name,
                error: 'invalid partial'
            });
            return next;
        } else {
            return getTextFile(partial.source).then(async (text) => {
                let current;
                if (text) {
                    handlerbars.registerPartial(partial.name, text);
                    current = {
                        partial: partial.name
                    };
                } else {
                    current = {
                        partial: partial.name,
                        error: 'empty or not found'
                    };
                }
                let next = await _loadPartials(partials, ndx + 1);
                next.unshift(current);
                return next;
            });
        }
    }
}

async function loadPartials(partials) {
    return _loadPartials(partials, 0);
}

function buildBody(template, data) {
    return getTemplate(template)
        .then(templateFunction => templateFunction(data));
}

async function sendEmail(to, subject, body) {
    let params = {
        Destination: {
            ToAddresses: [
                to
            ]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: subject
            }
        },
        Source: SOURCE_EMAIL
    };
    ses.sendEmail(params).promise();
}

async function _processMessages(messages, ndx) {
    if (ndx === messages.length) {
        return [];
    } else {
        let message = messages[ndx];
        let body = JSON.parse(message.body);
        // let timestamp = message.timestamp;
        let messageId = message.messageId;
        let receiptHandle = message.receiptHandle;

        let template = body.template;

        if (template.charAt(0) === '.' || template.charAt(0) === '/') {
            console.warn(`Invalid Template (${messageId}): ${template}`);
            let next = await _processMessages(messages, ndx + 1);
            next.unshift({ error: `Invalid Template (${messageId}): ${template}`, messageId: messageId });
            return next;
        } else {
            let templateContext = body.data;
            let subject = body.subject;
            let to = body.addresse;

            return buildBody(template, templateContext).then(async body => {
                let nextProm = _processMessages(messages, ndx + 1);
                let current = await sendEmail(to, subject, body);
                let next = await nextProm;
                next.unshift({ error: '', messageId: messageId });
                return next;
            });
        }
    }
}

async function processMessages(messages) {
    return _processMessages(messages, 0);
}

exports.handler = async (event) => {
    let result;
    if (configured) {
        console.info('already configured');
        result = await processMessages(event.Records);
    } else {
        console.info('load config ...');
        result = await getGlobalConfiguration().then(async (data) => {
            console.info('loading partials ...');
            return loadPartials(data.partials).then(async (partialsResult) => {
                let temp = JSON.stringify(partialsResult);
                console.log(`partials: ${temp}`);
                configured = true;
                return processMessages(event.Records);
            });
        });
    }
    console.log(JSON.stringify(result));
    return {
        batchItemFailures: result
            .filter(e => e.error !== '')
            .map(e => {
                return {
                    itemIdentifier: e.messageId
                };
            })
    };
};
