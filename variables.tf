variable "environment" {
  type = string
  default = "dev"
}

variable "branch-mapping" {
    type = map
    default = {
        "dev" = "develop"
        "prod" = "main"
    }
}

variable "repository" {
  type = string
  default = "template-repository"
}

variable "source-email" {
  type = string
  default = "contact@domain"
}

variable "disable-cache" {
  type = bool
  default = false
}

variable "aws_region" {
  type = string
  default = "us-east-1"
}
