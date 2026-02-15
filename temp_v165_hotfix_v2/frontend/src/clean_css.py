
import os

file_path = r"c:\Users\Juliano Freitas\Documents\GitHub\Team-OrioN\frontend\src\index.css"
output_path = r"c:\Users\Juliano Freitas\Documents\GitHub\Team-OrioN\frontend\src\index_clean.css"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    stripped = line.strip()
    if stripped:
        clean_lines.append(stripped + "\n")
    else:
        # Keep one newline if it was an empty line, but only if the last line wasn't already an empty line
        if clean_lines and clean_lines[-1] != "\n":
            clean_lines.append("\n")

with open(output_path, 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)

print(f"Cleaned file written to {output_path}")
