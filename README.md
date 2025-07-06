# type-lens

Cool extension that will try to replicate the very good F# ionide feature of having types as EOL comments or code lenses, but for \[any\] language.
Well, this is the idea, if this will truly work for any language it's more cloudy.
But should work well enough for most things.

Examples of ionide extension itself:

![eol](https://github.com/user-attachments/assets/151e29ac-62cf-41c1-a82c-659bd0be06e2)
![above](https://github.com/user-attachments/assets/902b5b21-1549-44df-97c1-1592f5526b72)


## Features

It's as simple as it gets, it takes your editor inlay hints and then transforms them into either end-of-line decorations or code lenses.

swift ->

![eol](https://github.com/user-attachments/assets/824763e5-a518-4726-9d80-942bb4150966)
![above](https://github.com/user-attachments/assets/9be293cf-ac97-43ad-9137-b558a964e4b9)

typescript ->

![eol](https://github.com/user-attachments/assets/617ff5c2-e54d-4252-9b43-81f89e9a67a8)
![above](https://github.com/user-attachments/assets/5867df22-6bbe-4b86-9965-421fd75a2fae)

lua ->

![eol](https://github.com/user-attachments/assets/4ebcb4b9-a6cb-41da-b3c3-829ebd3a5f1b)
![above](https://github.com/user-attachments/assets/9ecf883d-6e1f-4715-be18-b56280da4375)
(in lua case, the extension was not working with normal type hints, but param name hints work. In this case they show inverted tho, but this should be good enough for the majority of cases)

## Requirements

For things to work you need to actually enable the type hints of your LSPs in configs (if they have), but you can then hide them putting inlay hints as off, like this:

![image](https://github.com/user-attachments/assets/fe91e033-1e7c-4bc0-95b9-495ae99a521e)

## Extension Settings

* `typeLens.separator`: Changes the separator used in eol mode for when you have multiple hints (like many params), default is `, `
* `typeLens.prefix`: Changes the prefix or type lens to be anything you may want, defaults to `// `
* `typeLens.hintFormat`: Changes the hint display format, this is basically how it will appear in your screen for each hint. It replaces the argument {word} with the symbol that vscode reports to be just behind the inlay hint. And replaces the {hint} with the hint itself after it is properly processed. Default is `({word} {hint})`, it's kinda "lispy" and I like it.
* `typeLens.placement`: Determines which mode to use for types, `eol` means end-of-line and it's basically a decoration thing, and `above` means that it will display as a code lens, above the line of code you are in. Default is `eol`

Now those are more specific configs you may want to tune:
* `typeLens.eolMargin`: The amount of margin you want your eol thing to have, default is `0 0 0 0.25rem`
* `typeLens.eolFontStyle`: The font style of your eol, default is `normal`
* `typeLens.eolFontWeight`: The font weight of the eol, default is `normal`
* `typeLens.eolBorder`: The border of the eol. You can use anything that is valid CSS there (I think), but the default is `none`
* `typeLens.eolBackgroundColor`: The background color of the eol. Default is `none`.

## Known Issues

Parameter name hints are kinda inverted. This should be solvable given some processing or heuristics, but it's not \[that\] problematic, and it's kinda reasonable in a way, it works the same way as type hints but inverts as the value is the "name" and the param name is the "type" in this case. Maybe in the future I'll add something to cover this, maybe not.

It could not work if the extension you are using for your programming language don't have inlay hints, or if they block the usage of them if you have the inlay hints off for general editor options. But other than that, it should work for any extension that provides those things correctly.

## Release Notes

### 0.0.5
Adds an icon.

### 0.0.3
Fixed a problem in the configs where they did not appear in settings.

### 0.0.1

First release thing.
