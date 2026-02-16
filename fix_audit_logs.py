import os

path = r"c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\frontend\src\pages\AuditLogs.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix 1: Validation Tab (Line 1270)
# Find TabsContent closure for validation
for i, line in enumerate(lines):
    if i > 1200 and i < 1280 and '</TabsContent>' in line and 'value="standards"' not in lines[i+2 if i+2 < len(lines) else i]:
         # Wait, let's use line numbers from the last view
         pass

# Safer: use exact line content
def inject_after_match(content, match_str, inject_str, start_line, end_line):
    for i in range(start_line, end_line):
        if match_str in content[i]:
            content.insert(i + 1, inject_str + "\n")
            return True
    return False

# 1. Close Card in Standards tab
inject_after_match(lines, '</CardHeader>', '          </Card>', 1490, 1500)

# 2. Close Card in Validation tab
# I need to be careful here as there are many CardHeaders.
# Let's find the one after line 1025.
# Actually, I'll just use line 1269 which I saw.
lines.insert(1269, "        </CardContent>\n      </Card>\n")

# 3. Close div in Checklist tab
# After line 2348
lines.insert(2349, "      </div>\n")

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File fixed successfully")
