pipeline {
    agent any

    environment {
        DOCKER_ID = credentials('DOCKER_ID')
        DOCKER_PASSWORD = credentials('DOCKER_PASSWORD')
        RELEASE = "1.0.0"
        IMAGE_TAG = "${BUILD_NUMBER}"
        CR_REGISTRY = "cr.yandex/crpn9ikb6hp5v19o9957"
        CR_REPOSITORY = "inf-backend-dev"
        IMAGE_NAME = "${CR_REGISTRY}" + "/" + "${CR_REPOSITORY}"
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


        stage('List derictory ') {
            steps {
                sh "ls -la"
            }
        }


         stage('Docker login') {
             steps {
                 echo 'Initializing..'
                 echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
                 echo "Current branch: ${env.BRANCH_NAME}"
                //  sh 'echo $DOCKER_PASSWORD | docker login \
                //     --username $DOCKER_ID \
                //     --password --password-stdin \
                //     cr.yandex'
                 sh 'echo $DOCKER_PASSWORD | docker login -u $DOCKER_ID --password-stdin cr.yandex'

             }
         }

        stage('Build Docker Image') {
            steps {
                echo 'Building image..'
                sh "docker build -t $IMAGE_NAME:$IMAGE_TAG ."
            }
        }


        stage('Publish Docker Image to Yandex Cloud') {
            steps {
                echo 'Publishing image to YandexCloud..'
                sh "docker push $IMAGE_NAME:$IMAGE_TAG"
            }
        }


        
        stage('Cleanup Docker Image') {
            steps {
                sh "sudo docker rmi $IMAGE_NAME:$IMAGE_TAG "    
            }
        }   
    }
}
