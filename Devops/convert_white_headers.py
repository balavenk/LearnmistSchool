import os
import re

TARGET_DIR = r"c:\Users\balav\.gemini\antigravity\LearnmistSchool\frontend\src\pages"

def convert_plain_header(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Skip files that already have the pastel header
    if 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50' in content:
        return
    
    # We are looking for headers that look like:
    # {/* Header ... */}
    # <div className="flex ... ">
    #   <div>
    #      <h1 ...>...</h1>
    #      <p>...</p>
    #   </div>
    #   <button>...</button>
    # </div>
    # 
    # Or:
    # <div className="flex justify-between items-center mb-6">
    #      <h1 ...>...</h1>
    #      <button>...</button>
    # </div>
    
    # Let's try to do it by finding <h1.
    h1_regex = re.compile(r'<h1 className="([^"]*text-(?:xl|2xl|3xl)[^"]*)">([^<]*)</h1>', re.IGNORECASE)
    
    match = h1_regex.search(content)
    if not match: return
    
    start, end = match.span()
    h1_class = match.group(1)
    title = match.group(2)
    
    if 'text-transparent' in h1_class: 
        return # already a gradient text

    # It's a plain header. 
    # Replace the h1 with gradient text:
    new_h1 = f'<h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">{title}</h1>'
    
    content = content[:start] + new_h1 + content[end:]
    
    # Now try to wrap its immediate parent/grandparent if it has a `flex justify-between` layout
    # or just convert its wrapper.
    # It is tricky to parse DOM with regex. Let's do string replacement for known flex wrappers near this h1.
    
    # Standard 1:
    flex_wrapper_1 = re.compile(
        r'(<div className="flex flex-col sm:flex-row justify-between items-center gap-4">.*?</div>)', 
        re.DOTALL
    )
    # Standard 2:
    flex_wrapper_2 = re.compile(r'(<div className="flex justify-between items-center mb-[0-9]+">.*?</div>)', re.DOTALL)
    
    # Let's just find the closest previous `<div className="flex ... justify-between` before the H1
    wrapper_match = re.search(r'<div className="([^"]*justify-between[^"]*)"\s*>', content)
    if wrapper_match and wrapper_match.start() < start:
        # Instead of wrapping, just replace the class of this wrapper to be our pastel block, and keep its layout classes
        old_class = wrapper_match.group(1)
        # Remove mb-6 or anything, we'll construct a standard block:
        # if it's `bg-white` we remove it. 
        new_class = f"bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 {old_class.replace('bg-white', '').replace('rounded-xl', '').replace('shadow-sm', '').replace('border border-slate-200', '').replace('p-6', '').strip()} mb-6"
        content = content[:wrapper_match.start(1)] + new_class + content[wrapper_match.end(1):]
    
    # Replace slate text in paragraphs right after
    content = content.replace('text-slate-500 mt-1', 'text-slate-600 mt-1')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(filepath)}")

def main():
    for root, _, files in os.walk(TARGET_DIR):
        for fn in files:
            if fn.endswith('.tsx') and fn not in ['Login.tsx', 'Register.tsx', 'Home.tsx']:
                filepath = os.path.join(root, fn)
                convert_plain_header(filepath)

if __name__ == "__main__":
    main()
