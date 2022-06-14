export default {
  reader: null,
  keepReading: true,
  buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  },
  getSendFrame(sendStr) {
    let arr = [];
    for (var i = 0; i < sendStr.length / 2; i++) arr.push('0x' + sendStr.substr(i * 2, 2));
    return new Uint8Array(arr);
  },
  async stopReceiveAndClosePort(port) {

    this.keepReading = false;
    this.reader.releaseLock();
    await port.close();
  },
  // 发送数据
  async sendFrame(port, sendStr, config = { baudRate: 9600, parity: "even" }) {
    this.keepReading = true;
    if (!port.writable) {
      await port.open(config);
    }
    const writer = port.writable.getWriter();

    await writer.write(this.getSendFrame(sendStr));

    // 允许稍后关闭串口。
    writer.releaseLock();
  },
  // 接收数据 
  async receiveFrame(port, timeout = 1000) {
    let receiveStr = '';

    // 超时处理
    let time = setTimeout(() => {
      // 超时
      if (this.keepReading) {
        this.reader.cancel();
      } else {
        // 正确接收，不做处理
      }
    }, timeout);

    while (port.readable && this.keepReading) {
      this.reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value) {
            receiveStr += this.buf2hex(value).toUpperCase();
            // 正常处理
            if (receiveStr.substr(receiveStr.length - 2, 2) == '16') {
              clearTimeout(time);
              await this.stopReceiveAndClosePort(port);
              return receiveStr;
            }
          }
        }
        // 超时处理
        clearTimeout(time);
        await this.stopReceiveAndClosePort(port);
        return receiveStr;

      } catch (error) {
        // TODO: 处理非致命的读错误。
        console.log('错误：' + error);
      } finally {
        // 允许稍后关闭串口。
        // this.reader.releaseLock();
      }
    }
    await port.close();
  }
}