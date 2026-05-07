local stringify = pandoc.utils.stringify

local function latex_escape_for_verbatim(text)
  return text:gsub("\\end{Verbatim}", "\\textbackslash{}end{Verbatim}")
end

function CodeBlock(block)
  if block.classes:includes("mermaid") then
    return pandoc.RawBlock(
      "latex",
      "\\begin{netsentinelbox}[colback=NetSoft,colframe=NetBlue]{Mermaid Diagram}\n" ..
      "\\begin{Verbatim}[breaklines=true,fontsize=\\scriptsize]\n" ..
      latex_escape_for_verbatim(block.text) ..
      "\n\\end{Verbatim}\n\\end{netsentinelbox}"
    )
  end
end

local callout_map = {
  ["Important"] = "\\NSImportantBoxStart",
  ["Security Note"] = "\\NSSecurityBoxStart",
  ["MVP Limitation"] = "\\NSMVPBoxStart",
  ["Future Improvement"] = "\\NSFutureBoxStart",
}

local function first_strong_label(block)
  if block.t ~= "Para" and block.t ~= "Plain" then
    return nil
  end
  local first = block.content and block.content[1]
  if not first or first.t ~= "Strong" then
    return nil
  end
  local label = stringify(first)
  return callout_map[label] and label or nil
end

function BlockQuote(block)
  local label = first_strong_label(block.content[1])
  if not label then
    return nil
  end

  local blocks = pandoc.List(block.content)
  local first = blocks[1]
  local new_inlines = pandoc.List()
  local skip_next_space = false

  for i, inline in ipairs(first.content) do
    if i == 1 and inline.t == "Strong" then
      skip_next_space = true
    elseif skip_next_space and inline.t == "Space" then
      skip_next_space = false
    else
      skip_next_space = false
      new_inlines:insert(inline)
    end
  end

  if #new_inlines == 0 then
    blocks:remove(1)
  else
    first.content = new_inlines
    blocks[1] = first
  end

  local latex = pandoc.write(pandoc.Pandoc(blocks), "latex")
  return pandoc.RawBlock(
    "latex",
    callout_map[label] .. "\n" .. latex .. "\n\\NSBoxEnd"
  )
end
