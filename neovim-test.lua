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

-- Start LSP client - connect to TCP server using vim.lsp.rpc.connect
local lsp_client = vim.lsp.start({
  name = 'strudel-lsp',
  cmd = vim.lsp.rpc.connect('127.0.0.1', 5007),
  filetypes = { 'strudel' },
  root_dir = vim.fn.getcwd(),
  on_attach = function(client, bufnr)
    vim.cmd('echo "LSP attached: ' .. client.name .. '"')
  end,
})

-- Automatically attach LSP to strudel buffers
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'strudel',
  callback = function(args)
    if lsp_client then
      vim.lsp.buf_attach_client(args.buf, lsp_client)
    end
  end,
})

-- Keymaps
vim.api.nvim_set_keymap('n', 'gd', ':lua vim.lsp.buf.definition()<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', 'K', ':lua vim.lsp.buf.hover()<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', 'gr', ':lua vim.lsp.buf.references()<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', 'gn', ':lua vim.diagnostic.goto_next()<CR>', { noremap = true, silent = true })
vim.api.nvim_set_keymap('n', 'gp', ':lua vim.diagnostic.goto_prev()<CR>', { noremap = true, silent = true })

-- Completion
vim.api.nvim_set_keymap('i', '<C-x><C-o>', '<cmd>lua vim.lsp.buf.completion()<CR>', { noremap = true, silent = true })

-- Command to check LSP status
vim.api.nvim_create_user_command('LspStatus', function()
  local clients = vim.lsp.get_active_clients()
  if #clients == 0 then
    print('No LSP clients active')
  else
    for _, client in ipairs(clients) do
      print('LSP: ' .. client.name .. ' (id: ' .. client.id .. ')')
    end
  end
end, {})

vim.cmd('echo "Strudel LSP configured. Start server first: cd server/out && node server.js --tcp"')
