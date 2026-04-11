import os
import re

TARGET_DIR = r"c:\Users\balav\.gemini\antigravity\LearnmistSchool\frontend\src\pages"

H1_PATTERN = re.compile(r'(<h1[^>]*>.*?</h1>)', re.DOTALL)
FLEX_HEADER_PATTERN = re.compile(
    r'(<div\s+className="flex\s+(?:flex-col\s+md:flex-row\s+)?justify-between\s+items-start\s+(?:md:)?items-center[^"]*">\s*<div.*?</h1(?:.*?)(?:</button>\s*</div>\s*)*</div>)',
    re.DOTALL
)

NEW_H1_CLASS = 'text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2'
WRAPPER_START = '<div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6">\n                '
WRAPPER_END = '\n            </div>'

def get_h1_content(h1_tag):
    match = re.search(r'<h1[^>]*>(.*?)</h1>', h1_tag, re.DOTALL)
    return match.group(1).strip() if match else ""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Skip if already has enhanced header
    if "from-indigo-50 via-purple-50 to-pink-50" in content:
        return

    # Skip login/home/register
    basename = os.path.basename(filepath)
    if basename in ['Login.tsx', 'Register.tsx', 'Home.tsx']:
        return

    original_content = content
    
    # 1. Look for typical flex headers first:
    # <div className="flex justify-between items-center...
    #   <div> <h1... 
    def replace_flex(match):
        block = match.group(0)
        # Fix the h1 inside
        h1_match = re.search(r'<h1[^>]*>.*?</h1>', block, re.DOTALL)
        if h1_match:
            inner_text = get_h1_content(h1_match.group(0))
            new_h1 = f'<h1 className="{NEW_H1_CLASS}">{inner_text}</h1>'
            block = block.replace(h1_match.group(0), new_h1)
        return WRAPPER_START + block + WRAPPER_END

    # Try flex replacement
    new_content = FLEX_HEADER_PATTERN.sub(replace_flex, content)
    
    # 2. If no flex header was found or replaced, try isolated <h1> wrapped in a simple div
    if new_content == content:
        # Some are just <h1 className="...">Title</h1> optionally wrapped in <div>
        def replace_h1(match):
            h1_block = match.group(1)
            inner_text = get_h1_content(h1_block)
            new_h1 = f'<h1 className="{NEW_H1_CLASS}">{inner_text}</h1>'
            # See if we should just wrap it
            return f'{WRAPPER_START}<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div>{new_h1}</div></div>{WRAPPER_END}'
            
        # We need to be careful not to double wrap if there are multiple h1s, generally there is only one.
        first_h1 = H1_PATTERN.search(new_content)
        if first_h1:
            # ONLY replace the very first h1 to avoid breaking modals or other sections
            
            # actually we can manually find the start/end of the first h1
            start, end = first_h1.span()
            h1_block = first_h1.group(1)
            inner_text = get_h1_content(h1_block)
            new_h1 = f'<h1 className="{NEW_H1_CLASS}">{inner_text}</h1>'
            
            # replace in the content
            new_content = new_content[:start] + f'{WRAPPER_START}<div className="flex justify-between items-center">\n                    <div>\n                        {new_h1}\n                    </div>\n                </div>{WRAPPER_END}' + new_content[end:]

    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {os.path.relpath(filepath, TARGET_DIR)}")

for root, _, files in os.walk(TARGET_DIR):
    for fn in files:
        if fn.endswith('.tsx'):
            process_file(os.path.join(root, fn))

print("Done updating headers!")
