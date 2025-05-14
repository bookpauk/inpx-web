# inpx-web Docker Project

This project is a Dockerized application that utilizes Node.js and serves as a web application. The Docker container is built using a Dockerfile and is published to the GitHub Container Registry.

## Project Structure

```
inpx-web
├── .github
│   └── workflows
│       └── docker-build.yml
├── Dockerfile
└── README.md
```

## Getting Started

To get started with this project, follow the instructions below:

### Prerequisites

- Docker installed on your machine.
- GitHub account with access to the repository.

### Building the Docker Image

To build the Docker image locally, run the following command in the project directory:

```
docker build -t your-image-name .
```

### Running the Docker Container

After building the image, you can run the container using:

```
docker run -p 12380:12380 your-image-name
```

### CI/CD with GitHub Actions

This project includes a GitHub Actions workflow located in `.github/workflows/docker-build.yml`. This workflow is triggered on pushes to the `foxzi/dockerfile` branch and automates the process of building the Docker image and publishing it to the GitHub Container Registry.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.