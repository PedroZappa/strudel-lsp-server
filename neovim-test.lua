-- Strudel LSP Neovim Test Configuration
-- Usage: nvim -u neovim-test.lua test.strudel
-- Note: Start server first: cd server/out && node server.js --tcp

-- Enable logging for debugging
vim.lsp.set_log_level('debug')

-- Basic Neovim settings
vim.opt.number = true
vim.opt.relativenumber = true
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.termguicolors = true
vim.opt.updatetime = 300

-- Register .strudel filetype
vim.filetype.add({
  extension = {
    strudel = 'strudel',
  }
})

-- Set up syntax highlighting for strudel (basic)
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'strudel',
  callback = function()
    vim.cmd([[
      syntax match strudelFunction "\<\w\+\ze("
      syntax match strudelString "\"[^"]*\"" 
      syntax match strudelString "'[^']*'"
      syntax match strudelNumber "\<\d\+\(\.\d\+\)\=\>"
      syntax match strudelOperator "\.\w\+"
      syntax match strudelBracket "[\[\]\(\)\{\}]"
      
      highlight link strudelFunction Function
      highlight link strudelString String
      highlight link strudelNumber Number
      highlight link strudelOperator Operator
      highlight link strudelBracket Delimiter
    ]])
  end,
})

-- Start LSP client using vim.lsp.start_client for more control
local function start_lsp()
  local lsp_client = vim.lsp.start({
    name = 'strudel-lsp',
    cmd = { 'node', vim.fn.getcwd() .. '/server/out/server.js', '--tcp' },
    cmd_cwd = vim.fn.getcwd(),
    filetypes = { 'strudel' },
    root_dir = vim.fn.getcwd(),
    on_attach = function(client, bufnr)
      vim.cmd('echo "LSP attached: ' .. client.name .. '"')
      
      -- Enable completion capabilities
      local capabilities = client.server_capabilities
      vim.print("Server capabilities:", capabilities)
      
      -- Set up completion
      require('vim.lsp.completion').on_attach(client, bufnr)
    end,
  })
  return lsp_client
end

local lsp_client = start_lsp()

-- Attach LSP to strudel buffers when they open
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'strudel',
  callback = function(args)
    if lsp_client then
      vim.lsp.buf_attach_client(args.buf, lsp_client)
    end
  end,
})

-- Keymaps - using vim.keymap.set instead of nvim_set_keymap
vim.keymap.set('n', 'gd', vim.lsp.buf.definition, { buffer = 0, silent = true })
vim.keymap.set('n', 'K', vim.lsp.buf.hover, { buffer = 0, silent = true })
vim.keymap.set('n', 'gr', vim.lsp.buf.references, { buffer = 0, silent = true })
vim.keymap.set('n', 'gn', vim.diagnostic.goto_next, { buffer = 0, silent = true })
vim.keymap.set('n', 'gp', vim.diagnostic.goto_prev, { buffer = 0, silent = true })

-- Completion keymap
vim.keymap.set('i', '<C-x><C-o>', vim.lsp.buf.completion, { buffer = 0, silent = true })

-- Set up completion with completeopt
vim.opt.completeopt = { 'menu', 'menuone', 'noselect' }

-- Command to check LSP status
vim.api.nvim_create_user_command('LspStatus', function()
  local clients = vim.lsp.get_active_clients()
  if #clients == 0 then
    print('No LSP clients active')
  else
    for _, client in ipairs(clients) do
      print('LSP: ' .. client.name .. ' (id: ' .. client.id .. ')')
      print('  capabilities:', vim.inspect(client.server_capabilities))
    end
  end
end, {})

-- Command to manually trigger completion
vim.api.nvim_create_user_command('TestCompletion', function()
  vim.lsp.buf.completion()
end, {})

vim.cmd('echo "Strudel LSP. Start server: cd server/out && node server.js --tcp"')
