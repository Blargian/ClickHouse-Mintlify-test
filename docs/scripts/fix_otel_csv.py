import sys

input_path = "/Users/sstruw/Desktop/Mintlify/Test/assets/data-otel-traces.csv"

with open(input_path, "r") as f:
    lines = f.readlines()

output_lines = []
# Header as-is
output_lines.append(lines[0])

for line in lines[1:]:
    line = line.rstrip("\n").rstrip("\r")
    if not line:
        continue

    # Find first '{' - start of ResourceAttributes
    first_brace = line.index("{")
    prefix = line[:first_brace]  # includes trailing comma

    rest = line[first_brace:]

    # Find matching '}' for ResourceAttributes
    depth = 0
    end_resource = -1
    for i, ch in enumerate(rest):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end_resource = i
                break

    resource_attr = rest[: end_resource + 1]

    # After ResourceAttributes there's a comma, then SpanAttributes
    remaining = rest[end_resource + 1 :]
    # remaining starts with ','
    span_attr = remaining.lstrip(",")

    output_lines.append(f'{prefix}"{resource_attr}","{span_attr}"\n')

with open(input_path, "w") as f:
    f.writelines(output_lines)

print(f"Processed {len(output_lines) - 1} data lines")
