resource "aws_sqs_queue" "email-sender" {
    name = "email-sender-${var.environment}"
}

data "archive_file" "lambda-source" {
  type        = "zip"
  source_file = "${path.module}/build/index.js"
  output_path = "${path.module}/build/${filesha256()}index.zip"
}

resource "aws_lambda_function" "email-sender" {
  function_name = "email-sender-${var.environment}"
  handler = "index.handler"
  role = "${aws_iam_role.example_lambda.arn}"
  runtime = "nodejs16.x"

  filename = "${data.archive_file.lambda-source.output_path}"
  source_code_hash = "${data.archive_file.lambda-source.output_base64sha256}"
  environment {
    variables = {
      "BRANCH" = var.branch-mapping[var.environment]
      "REPOSITORY" = var.repository
      "SOURCE_EMAIL" = var.source-email
      "DISABLE_CACHE" = var.disable-cache
    }
  }
}
