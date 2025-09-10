# 用docker在mac上编译linux上运行的golang程序

docker run --rm --platform linux/amd64 \
  -v "$PWD":/app \
  -w /app \
  -e GOPROXY=https://goproxy.cn,direct \
  -e GOPRIVATE= \
  golang:latest \
  go build -o mqtt-app-linux
