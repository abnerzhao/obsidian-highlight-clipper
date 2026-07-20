const ObsidianUri = (() => {
  function resolveFilePath(template, date = new Date()) {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const tokens = {
      '{{YYYY/MM/DD}}': `${yyyy}/${mm}/${dd}`,
      '{{YYYY-MM-DD}}': `${yyyy}-${mm}-${dd}`,
      '{{YYYY}}': yyyy,
      '{{MM}}': mm,
      '{{DD}}': dd
    };
    return Object.entries(tokens).reduce((path, [token, value]) => path.replaceAll(token, value), template.trim());
  }

  function isAbsolutePath(path) {
    return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
  }

  function vaultNameFromPath(path) {
    return path.split(/[\\/]+/).filter(Boolean).at(-1);
  }

  function joinPath(root, file) {
    return `${root.replace(/[\\/]+$/, '')}/${file.replace(/^[\\/]+/, '')}`;
  }

  function build({ saveMode, customFile, vaultName, content, date }) {
    const vault = vaultName.trim();
    const query = (params) => Object.entries(params)
      .filter(([, value]) => value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    if (saveMode === 'daily') {
      return `obsidian://daily?${query({ vault: isAbsolutePath(vault) ? vaultNameFromPath(vault) : vault, append: 'true', content })}`;
    }
    if (!vault) throw new Error('VAULT_NAME_REQUIRED');
    const file = resolveFilePath(customFile, date);
    if (isAbsolutePath(vault)) {
      return `obsidian://new?${query({ path: joinPath(vault, file), append: 'true', content })}`;
    }
    return `obsidian://new?${query({ vault, file, append: 'true', content })}`;
  }

  return { build, resolveFilePath };
})();

if (typeof module !== 'undefined') module.exports = ObsidianUri;
