export class ResourcePath {
  constructor(resource, type, id, extra = []) {
    this.resource = resource;
    this.type = type;
    this.id = id;
    this.extra = extra;
  }

  static withoutExtra(resource, type, id) {
    return new ResourcePath(resource, type, id, []);
  }

  static withExtra(resource, type, id, extra) {
    return new ResourcePath(resource, type, id, extra);
  }

  getExtraFirstValue(name) {
    const extraValue = this.extra.find((ev) => ev.name === name);
    return extraValue === undefined ? undefined : extraValue.value;
  }

  eqNoExtra(other) {
    return (
      this.resource === other.resource &&
      this.type === other.type &&
      this.id === other.id
    );
  }
}

export class ResourceRequest {
  constructor(base, path) {
    this.base = base;
    this.path = path;
  }

  eqNoExtra(other) {
    return this.base === other.base && this.path.eqNoExtra(other.path);
  }
}
