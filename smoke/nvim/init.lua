local uv = vim.uv or vim.loop

local root = os.getenv('STRUDEL_SMOKE_ROOT') or vim.fn.getcwd()
local server_module = os.getenv('STRUDEL_SERVER_MODULE') or root .. '/dist/src/server.js'
local node_bin = os.getenv('STRUDEL_NODE_BIN') or 'node'
local result_path = os.getenv('STRUDEL_SMOKE_RESULT_PATH')
local document_path
local source = table.concat({
  'const localPattern = s("bd sd").fast(2)',
  'localPattern',
  'missingGlobal()',
}, '\n')

local function write_result(result)
  if not result_path then
    return
  end
  vim.fn.mkdir(vim.fn.fnamemodify(result_path, ':h'), 'p')
  local encoded = vim.fn.json_encode(result)
  local ok, err = pcall(vim.fn.writefile, { encoded }, result_path)
  if not ok then
    error(err)
  end
end

local function wait_for(label, predicate, timeout_ms)
  local deadline = uv.hrtime() + (timeout_ms or 10000) * 1e6
  while uv.hrtime() < deadline do
    if predicate() then
      return
    end
    vim.wait(50)
  end
  error('timed out waiting for ' .. label)
end

local function request(method, params, timeout_ms)
  local responses = vim.lsp.buf_request_sync(0, method, params, timeout_ms or 5000)
  if not responses then
    error('no response for ' .. method)
  end
  for _, response in pairs(responses) do
    if response.error then
      error(method .. ' failed: ' .. vim.inspect(response.error))
    end
    if response.result ~= nil then
      return response.result
    end
  end
  error('empty response for ' .. method)
end

local function diagnostic_code(diagnostic)
  local code = diagnostic.code
  if type(code) == 'string' then
    return code
  end
  if type(code) == 'table' and type(code.value) == 'string' then
    return code.value
  end
  return nil
end

local function has_symbol(symbols, name)
  for _, symbol in ipairs(symbols or {}) do
    if symbol.name == name or has_symbol(symbol.children, name) then
      return true
    end
  end
  return false
end

local function run()
  local behaviours = {}
  local client_id
  document_path = vim.fn.tempname() .. '.strudel'

  vim.fn.writefile(vim.split(source, '\n'), document_path)
  vim.cmd('edit! ' .. vim.fn.fnameescape(document_path))
  vim.bo.filetype = 'strudel'

  local resolved_node = vim.fn.exepath(node_bin)
  assert(resolved_node ~= '', 'node executable not found: ' .. node_bin)

  client_id = vim.lsp.start({
    name = 'strudel-lsp-smoke',
    cmd = { resolved_node, server_module },
    root_dir = root,
    capabilities = vim.lsp.protocol.make_client_capabilities(),
  })
  assert(client_id ~= nil, 'vim.lsp.start did not return a client id')

  wait_for('client attachment', function()
    return #vim.lsp.get_clients({ bufnr = 0 }) > 0
  end)

  local client = vim.lsp.get_client_by_id(client_id)
  assert(client ~= nil, 'client disappeared after attachment')
  assert(client.server_capabilities.completionProvider ~= nil, 'completion capability is missing')
  assert(client.server_capabilities.documentSymbolProvider ~= nil, 'document symbol capability is missing')
  table.insert(behaviours, 'initialize/capabilities over stdio through the built-in LSP client')

  local diagnostics_ok, diagnostics_error = pcall(wait_for, 'unknown-global diagnostic', function()
    for _, diagnostic in ipairs(vim.diagnostic.get(0)) do
      if diagnostic_code(diagnostic) == 'unknown-global' then
        return true
      end
    end
    return false
  end, 10000)
  assert(diagnostics_ok, tostring(diagnostics_error) .. ': ' .. vim.inspect(vim.diagnostic.get(0)))
  table.insert(behaviours, 'didOpen publishes diagnostics for an unresolved global')

  local uri = vim.uri_from_bufnr(0)
  local completion = request('textDocument/completion', {
    textDocument = { uri = uri },
    position = { line = 1, character = #'localPattern' },
  })
  local completion_items = completion.items or completion
  local found_completion = false
  for _, item in ipairs(completion_items) do
    if item.label == 'localPattern' then
      found_completion = true
      break
    end
  end
  assert(found_completion, 'local completion was not returned')
  table.insert(behaviours, 'position-aware completion returns the local declaration')

  local symbols = request('textDocument/documentSymbol', {
    textDocument = { uri = uri },
  })
  assert(has_symbol(symbols, 'localPattern'), 'document symbols omit localPattern')
  table.insert(behaviours, 'document symbols expose the declared pattern')

  vim.api.nvim_buf_set_lines(0, 2, 2, false, { 'const changed = 3;' })
  wait_for('updated document symbols', function()
    local updated = request('textDocument/documentSymbol', {
      textDocument = { uri = uri },
    })
    return has_symbol(updated, 'changed')
  end)
  table.insert(behaviours, 'didChange is synchronized and updates document symbols')

  client:stop()
  wait_for('client shutdown', function()
    return vim.lsp.get_client_by_id(client_id) == nil
  end, 5000)
  client_id = nil
  table.insert(behaviours, 'shutdown and client stop complete')

  write_result({
    schemaVersion = 1,
    client = 'nvim',
    editorVersion = vim.version().major .. '.' .. vim.version().minor .. '.' .. vim.version().patch,
    clientLibraryVersion = 'built-in',
    serverModule = 'dist/src/server.js',
    transport = 'stdio',
    status = 'pass',
    behaviours = behaviours,
  })
end

local ok, err = pcall(run)

if document_path then
  vim.fn.delete(document_path)
end

if not ok then
  write_result({
    schemaVersion = 1,
    client = 'nvim',
    status = 'fail',
    error = tostring(err),
  })
  print('Neovim smoke failure: ' .. tostring(err))
  vim.cmd('cquit 1')
else
  vim.cmd('qa!')
end
