pipeline {
    agent any

    tools {
        nodejs 'node14'
    }

    environment {
        SCANNER_HOME =  tool 'sonar-scanner'
        DOCKER_ID_NEXUS = credentials('DOCKER_ID_NEXUS')
        DOCKER_PASSWORD_NEXUS = credentials('DOCKER_PASSWORD_NEXUS')
        NEXUS_URL = credentials('NEXUS_URL')
        GITHUB_TOKEN = credentials('GITHUB_TOKEN')
        RELEASE = "1.0.0"
        IMAGE_TAG = "${BUILD_NUMBER}"
        CR_REGISTRY = "cr.yandex/crpn9ikb6hp5v19o9957"
        CR_REPOSITORY = "inf-backend-dev"
        IMAGE_NAME = "${CR_REGISTRY}" + "/" + "${CR_REPOSITORY}"
        CI_PROJECT_NAME =  "/HelmCharts"

    }



    stages {
        stage("Cleanup Workspace"){
            steps {
                cleanWs()
            }

        }
    
        stage("Checkout from SCM"){
            steps {
                git branch: 'main', credentialsId: 'jenkins-github', url: 'git@github.com:jakkaru-devops/inf-backend-dev.git'
            }
        }


        stage('List derictory backend') {
            steps {
                sh "ls -la"
            }
        }


        // stage('Install Dependensice') {
        //     steps {
        //         sh "npm install"
        //     }
        // }

        stage('Trivy FS Scane Backend Project') {
            steps {
                sh "trivy fs --format table -o fs-report.html ."
            }
        }


        stage('Trivy FS отчёт') {
            steps {
                sh "cat fs-report.html"
            }
        }


        stage('SonaQube Scanner Backend') {
            steps {
                withSonarQubeEnv('sonar') {
                    sh "$SCANNER_HOME/bin/sonar-scanner -Dsonar.projectKey=INF-BACKEND -Dsonar.projectName=INF-BACKEND"
                }
            }
        }


        stage('Docker login') {
             steps {
                 echo 'Initializing..'
                 echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
                 echo "Current branch: ${env.BRANCH_NAME}"
                 sh "docker login -u $DOCKER_ID_NEXUS -p $DOCKER_PASSWORD_NEXUS $NEXUS_URL"
             }
         }

        stage('Build Docker Image') {
            steps {
                echo 'Building image..'
                sh "docker build -t $NEXUS_URL/inf-backend-dev:$IMAGE_TAG ."
            }
        }


        stage('Trivy Image Scane Backend Project') {
            steps {
                sh "trivy image --format table -o image-report.html --timeout 20m  --scanners vuln $NEXUS_URL/inf-backend-dev:$IMAGE_TAG"
            }
        }
        
        stage('Trivy Image отчёт ') {
            steps {
                sh "cat image-report.html"
            }
        }



        stage('Publish Docker Image to NexusHUB') {
            steps {
                echo 'Publishing image to NexusHUB..'
                sh "docker push $NEXUS_URL/inf-backend-dev:$IMAGE_TAG"
            }
        }


        
        stage('Cleanup Docker Image') {
            steps {
                sh "sudo docker rmi $NEXUS_URL/inf-backend-dev:$IMAGE_TAG "    
            }
        }   

        stage("Checkout from SCM Helm Chart"){
            steps {
                echo 'Checkout from SCM Helm Chart..'
                git branch: 'main', credentialsId: 'jenkins-github', url: 'https://github.com/jakkaru-devops/inf-argocd.git'

            }
        }

        stage('List derictory fronted') {
            steps {
                sh "ls -la"
            }
        } 
           

        stage('Configure Git') {
            steps {
                sh 'git config --global user.email "savamedvedevvv@gmail.com"'
                sh 'git config --global user.name "jakkaru-devops"'
                sh 'git config --list --show-origin'
                sh 'git config --global push.autoSetupRemote true'
            }
        }

       stage('Update helm chart values version backend ') {
            steps {
                dir('HelmCharts/Production') {
                    sh 'echo "Current directory: $(pwd)"'
                    sh 'ls -la'
                    sh "yq -i '.api.version =\"${IMAGE_TAG}\"' values.yaml"
                    sh "git add values.yaml"
                    sh "git commit -m 'CI: Update app version to ${IMAGE_TAG}'"
                    sh 'git branch --set-upstream-to origin/main main'
                    sh 'git config --global credential.helper store'
                    sh 'echo "https://${jakkaru-devops}:${GITHUB_TOKEN}@github.com" > ~/.git-credentials'
                    sh 'git push  origin main'
                }
            }
        }
    }
}
