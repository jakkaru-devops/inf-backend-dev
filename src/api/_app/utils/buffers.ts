class Buffers {
  _buffers = [];

  writeBuffer(key: string, data: any) {
    const buffer = Buffer.from(JSON.stringify(data));
    this._buffers.push({
      [key]: buffer,
    });
  }

  findBuffers(key: string) {
    // const data = JSON.parse(this._buffers
    //   .filter(data => data[key])[key].toString())

    const buffer = this._buffers.filter(data => data[key])[key]
    if(!buffer) return buffer
  }
}

const buffers = new Buffers();

export default buffers