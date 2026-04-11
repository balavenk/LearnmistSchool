import os
import re

TARGET_DIR = r"c:\Users\balav\.gemini\antigravity\LearnmistSchool\frontend\src\pages"

def convert_theme(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # 1. Replace the outer dark gradient Wrapper
    wrapper_regex = re.compile(
        r'className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-[0-9]+(?: text-white)?(.*?)"', 
        re.MULTILINE
    )
    content = wrapper_regex.sub(
        r'className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-indigo-100 mb-6 \1"', 
        content
    )

    # 2. Replace the `text-white` manually from flex wrappers if it existed separately
    # Already done in above regex if they shared one class. If text-white is standalone, we fix it
    
    # 3. Fix paragraph text colors inside the header (text-indigo-100 -> text-slate-600)
    # Be careful not to replace text-indigo-100 blindly everywhere, but mostly it's used in headers
    content = content.replace('text-indigo-100', 'text-slate-600')
    content = content.replace('text-white/80', 'text-slate-500')

    # 4. Fix h1 gradients
    # Some h1s are `<h1 className="text-2xl font-bold mb-2">Title</h1>`
    # Some are `<h1 className="text-3xl font-black text-slate-900 tracking-tight">Title</h1>`
    h1_regex = re.compile(r'<h1\s+className="[^"]*"\s*>')
    new_h1_class = '<h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">'
    
    # We only want to replace the first H1 in the file if we changed the theme, or generally any H1 that looks like a page title.
    # We can replace all H1s if there aren't modal H1s. Actually, let's just replace the first one.
    if content != original: # If we modified the wrapper, it implies this is a dark theme file
        match = h1_regex.search(content)
        if match:
            start, end = match.span()
            content = content[:start] + new_h1_class + content[end:]

    # 5. Fix icon wrappers: `bg-white/20 backdrop-blur-sm rounded-xl p-3` -> `bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-3 shadow-lg`
    content = content.replace(
        'bg-white/20 backdrop-blur-sm rounded-xl p-3',
        'bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-3 shadow-lg'
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {os.path.basename(filepath)}")

def main():
    modified_any = False
    for root, _, files in os.walk(TARGET_DIR):
        for fn in files:
            if fn.endswith('.tsx') and fn not in ['Login.tsx', 'Register.tsx', 'Home.tsx']:
                filepath = os.path.join(root, fn)
                convert_theme(filepath)
                modified_any = True

if __name__ == "__main__":
    main()
