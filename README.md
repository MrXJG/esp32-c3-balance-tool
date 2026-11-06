# ESP32-C3 动平衡工具

这是一个面向 ESP32-C3 的无品牌动平衡工具界面和已验证固件发布目录。项目保留原有的测量、标定、记录、诊断和 OTA 操作入口，并将网页界面重做为深色工业仪表风格。

## 项目内容

- `webui/`：可阅读和继续修改的 Web UI 源文件
- `firmware/v1.6.18-ui-nobrand.bin`：完整修改版镜像
- `firmware/app0-ui-nobrand.bin`：应用分区镜像，写入地址为 `0x10000`
- `docs/wiring.svg`：MPU6050、TCRT5000 与 ESP32-C3 接线图
- `docs/刷写前验证.md`：镜像验证和刷写前检查
- `tools/verify_artifacts.py`：校验公开固件文件大小和 SHA-256

## 硬件接线

| 模块 | 引脚 | ESP32-C3 |
| --- | --- | --- |
| MPU6050 | VCC | 3V3 |
| MPU6050 | GND | GND |
| MPU6050 | SDA | GPIO4 |
| MPU6050 | SCL | GPIO3 |
| MPU6050 | AD0 | 模块自身 GND，地址 0x68 |
| MPU6050 | INT | 不接 |
| MPU6050 | XDA / XCL | 不接 |
| TCRT5000 | VCC | 3V3 |
| TCRT5000 | GND | GND |
| TCRT5000 | DO | GPIO6 |
| TCRT5000 | AO | 不接 |

接线图：[`docs/wiring.svg`](docs/wiring.svg)

## 验证固件

需要 Python 3：

```bash
python3 tools/verify_artifacts.py
```

检查 ESP32 镜像结构：

```bash
esptool image-info firmware/app0-ui-nobrand.bin
```

macOS 可通过 USB-Serial/JTAG 直接连接 ESP32-C3。刷写前请确认设备已进入下载模式，保存自己的原始备份，并按照 [`docs/刷写前验证.md`](docs/刷写前验证.md) 核对地址和镜像类型。

## 发布范围

仓库只发布无品牌 UI 源文件、接线图、验证工具和修改版固件。原始固件、设备 NVS、原始网页和本机提取目录没有放入仓库。`webui/`、接线图、文档和验证脚本按 MIT License 发布；预编译固件属于由既有设备固件修改得到的衍生工件，使用时请自行确认原始固件的授权范围。

## License

本仓库原创源文件、接线图、文档和工具脚本使用 MIT License，见 [`LICENSE`](LICENSE)。
