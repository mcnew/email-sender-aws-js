# email sender aws (javascript)

An Lambda function in javascript, using [Handlebars](https://handlebarsjs.com/) as templating engine to create html email body

## Summary

Deploy the lambda function, attach to a SQS queue, create a template in a CodeCommit repository and send emails just by placing messages in the queue through SES.

### Required AWS Services

- SQS
- AWS Lambda
- CodeCommit
- SES

## Description

## Usage

### Queue Message

The message requires 4 attributes

- ***template***: The name of handlebars template without extension (.hbs)
- ***subject***: Email subject
- ***addresse***: Email addresse (to)
- ***data***: Data to evaluate the template

Example

``` json
{
    "template": "welcome_template",
    "subject": "Welcome email",
    "addresse": "email @ domain",
    "data": {
    }
}
```

### CodeCommit (handlebars) templates

Git structure

```plaintext
/configuration.json
/email/
       welcome_template.hbs
/partials/
       header.hbs
       footer.hbs
```

### configuration.json structure

Example
```json
{
    "partial": [
        "header",
        "footer"
    ]
}
```
