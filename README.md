# Image Branding Tool

Simple software to add branding to one image or a whole folder of images.

## Features
- Add **text branding** (e.g., your brand name)
- Add **logo branding** (PNG recommended)
- Supports multiple positions:
  - `bottom-left`
  - `bottom-center` (default)
  - `bottom-right`
  - `top-left`
  - `top-center`
  - `top-right`
  - `center`
- Batch mode for full folders

## Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

### 1) Text branding at bottom (default)
```bash
python brander.py --input ./images --output ./branded --text "MyBrand"
```

### 2) Logo branding in top-right
```bash
python brander.py --input ./images --output ./branded --logo ./logo.png --position top-right
```

### 3) Text + logo in center with custom opacity
```bash
python brander.py \
  --input ./images \
  --output ./branded \
  --text "MyBrand" \
  --logo ./logo.png \
  --position center \
  --opacity 200
```

## Main options
- `--position`: choose where branding appears
- `--margin`: distance from edge (pixels)
- `--opacity`: 0-255
- `--font`, `--font-size`, `--text-color`
- `--logo-scale`: max logo width as a % of image width

