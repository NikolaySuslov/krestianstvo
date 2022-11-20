function serializeChildren(root) {
    const result = {};
    for (let i = 0, len = root.owned.length; i < len; i++) {
      const node = root.owned[i];
      result[node.componentName ? `${node.componentName}:${node.name}` : node.name] = { ...serializeValues(node.sourceMap),
        ...(node.owned ? serializeChildren(node) : {})
      };
    }
    return result;
  }

  function serializeValues(sources = {}) {
    const k = Object.keys(sources);
    const result = {};
    for (let i = 0; i < k.length; i++) {
      const key = k[i];
      result[key] = sources[key].value;
    }
    return result;
  }

  export function serializeGraph(owner) {
    //owner || (owner = Owner);
    if (!owner) return {};
    return { ...serializeValues(owner.sourceMap),
      ...(owner.owned ? serializeChildren(owner) : {})
    };
  }