# Executables (local)
DOCKER = docker
DOCKER_COMP = docker-compose

# Docker containers
PHP_CONT = $(DOCKER_COMP) exec php

# Executables
PHP      = $(PHP_CONT) php
COMPOSER = $(PHP_CONT) composer
SYMFONY  = $(PHP_CONT) bin/console

# Misc
.DEFAULT_GOAL = help
.PHONY        = help build up start down logs sh composer vendor sf cc

## —— 🎵 🐳 Makefile 🐳 🎵 ——————————————————————————————————
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

clear: ## Delete all dangling (untagged, irrelevant) images
	@$(DOCKER) image prune -f

dev: ## Run docker container in development mode
	@$(DOCKER_COMP) -f docker-compose.dev.yml up --detach

## —— Docker 🐳 ————————————————————————————————————————————————————————————————
build: ## Builds the Docker images
	@$(DOCKER_COMP) build

start: ## Start the docker hub in detached mode (no logs)
	@$(DOCKER_COMP) up --detach

up: build start clear ## Build and start the containers

down: ## Stop docker containers
	@$(DOCKER_COMP) down

logs: ## Show live logs
	@$(DOCKER_COMP) logs --follow inf-backend-app


cc: c=c:c ## Clear the cache
cc: sf
