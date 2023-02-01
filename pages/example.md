---
layout: post
title: 示例
permalink: /example
---

## 表格

```
|---
| Default aligned | Left aligned | Center aligned | Right aligned
|-|:-|:-:|-:
| First body part | Second cell | Third cell | fourth cell
| Second line |foo | **strong** | baz
| Third line |quux | baz | bar
|---
| Second body
| 2 line
|===
| Footer row
````

结果：

|---
| Default aligned | Left aligned | Center aligned | Right aligned
|-|:-|:-:|-:
| First body part | Second cell | Third cell | fourth cell
| Second line |foo | **strong** | baz
| Third line |quux | baz | bar
|---
| Second body
| 2 line
|===
| Footer row

## 图片

限制图片高度和宽度

```
![fig1](/images/2023/3_fig1.png){: height="36px" width="36px"}
```

## 强调

```
<div class="card">

|---
| Default aligned | Left aligned | Center aligned | Right aligned
|-|:-|:-:|-:
| First body part | Second cell | Third cell | fourth cell
| Second line |foo | **strong** | baz
| Third line |quux | baz | bar
|---
| Second body
| 2 line
|===
| Footer row

</div>
```

<div class="card">

- abcd
- efgh
- abcd
- efgh

</div>

## 数学公式

```
这是块状公式：

$$E=MC^2$$

这是行内公式 $$E=MC^2$$

无论块状公式还是行内公式，都使用 $$ 包裹起来
```

这是块状公式：

$$E=MC^2$$

这是行内公式 $$E=MC^2$$
