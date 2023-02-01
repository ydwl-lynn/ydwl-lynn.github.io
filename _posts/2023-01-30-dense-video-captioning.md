---
layout: post
title: 论文阅读 - Dense-Captioning Events in Videos
category: Dense video captioning
tag: 博客
---

- *
{:toc}

## 前言

随着大规模动作数据集的引入，动作检测任务被提出并取得不错的性能。但是该任务存在一个局限性：缺乏细节。因此，后续工作探索使用句子描述来解释视频动作语义。在此基础上进一步提出了Dense video captioning（即识别视频中的所有事件并用自然语言描述它们），如图1所示。

![fig1](/images/2023/3_fig1.png){:width="550px"}

本文是由李飞飞团队提出的 Dense video captioning 的开山之作。本文的贡献如下：

- 首次提出了 dense-captioning events 任务，它涉及检测和描述视频中的事件；
- 设计了一个新的模型，能够同时识别视频中的所有事件，并使用自然语言描述检测到的事件。
- 提出一种新的数据集：ActivityNet Captions。

## 方法概述

本文方法的整体框架图如图2所示，主要包括：proposal 模块和 caption 模块。我们首先结合 Dense video captioning 的研究挑战来简述每个模块的研究动机，然后再依次详细介绍各模块。
![fig2](/images/2023/3_fig2.png)

Dense video captioning 的挑战是：

1）视频中的时间可以跨越多个时间尺度，甚至可以重叠。

<div class="card">
以前的方法：通过使用平均池化或循环神经网络对整个视频进行编码。这种方法适用与短视频，但对于跨越几分钟的长视频序列进行编码时会导致梯度消失，阻碍训练的成功。

本文方法：引入一个 proposal 模块，将生成动作 proposal 的工作扩展为事件的多尺度检测，用来捕获视频中包含的短的、长的以及跨越几分钟的事件；
</div>

2）给定视频中的事件通常是相互关联的。因此模型必须能够使用周围事件的上下文来说明每个事件。

<div class="card">
本文方法：引入一个 caption 模块，该模块利用 proposal 模块中所有事件的上下文来生成每个描述语句。
</div>

最后，为了评估我们的模型并对 Dense video captioning 进行基准测试，我们引入一个大规模的数据集：ActivityNet Captions。

<div class="card">
ActivityNet Captions 数据集：包含从 ActivityNet 数据集中截取的20k个视频，其中每个视频都带有一系列时序定位描述；包含长达10分钟的视频，每个视频平均带有3.65句文本描述。这些描述指可能同时发生的事件没导致视频片段重叠。我们确保给定视频中每个描述都是唯一的，并且只涉及一个片段。数据集中的视频是以人类活动为中心，但描述也可能涉及非人类活动。
</div>

### 公式化定义

- 输入：一系列视频帧 $$v=\left\{v_{t}\right\}$$ 其中, $$t\in 0,\cdots ,T-1$$ 表示按时间顺序的索引帧。

- 输出：一组描述语句 $$s_{i}\in S$$ 其中, $$s_{i}=\left ( t^{start},t^{end},\left \{v_{j}\right \}\right )$$ 由每个句子的开始和结束时间组成，每个句子由一组词 $$v_{j}\in V$$ 定义，每个词的长度不同，V表示词汇集。

本文模型首先将视频帧通过 proposal 模块生成一组 proposals 。

$$P=\left \{ left ( t_{i}^{start},t_{i}^{end},score_{i},h_{i}\right )right \}$$

所有得分高于阈值的 proposals 都被输入到 caption 模块中，caption 模块使用来自其他 proposal 的上下文事件，同时为每个事件配上文本描述。proposal 模块输出的每个事件的隐藏表示$$h_{i}$$被用作 caption 模块的输入，然后 caption 模块同时利用其他事件的上下文来生成每个事件的描述。

### proposal模块

- 输入：利用C3D网络提取的视频特征序列：

$$\left \{f_{t}=F\left ( v_{t}:v_{t+\delta}\right )\right \}$$

- proposal 模块：实际上是 DAPs 的变体。首先介绍一下 DAPs 模型：

DAPs 是2016年 ECCV 提出的一种用于 temporal action proposals 任务的方法。该任务根据长视频的动作语义信息在时间维度将长视频分割成多个 segment ，保证每个 segment 包含一个 action 。由于 action segments 的长度不同，在之前的方法中需要设置不同的滑动窗口多次扫描整个视频，再使用极大似然的方法找到最合适的 segment ，这种方法运行速度很慢。而 DAPs 只使用了一个滑窗就可以得到不同尺度的 proposal ，只对视频处理一遍因此速度是之前算法的10倍。它的具体模型如图3所示。

对于输入的整个视频先使用 C3D 网络来提取视频特征，之后输入到 LSTM 网络来把这些特征串联起来，隐藏层$$h$$作为时序特征，再使用滑动窗口来扫描整个特征序列，得到预测的 action segment 并且对每个 segment 打分。至于如何用一个滑动窗口得到不同尺度的 segment ，文章使用了 anchor 机制，anchor 的尺度使用 k-means 聚类来对实际的 action segments 处理，得到 k 种尺度的 anchor ，再得到不同尺度的 segment 。训练时的公式如下：

$$\left (x^{*},\theta ^{*}\right)=\underset{x,\theta}{argmin}\alpha L_{match}\left (x,S\left (\theta \right),A\right)+L_{conf}\left (x,C\left (\theta \right)\right)$$

$$s.t. x_{i,j}\in \left \{0,1\right \},\sum_{i,j}x_{ij}=1$$

![](/images/2023/3_fig3.png)

本文的 proposal 模块：将输入特征使用 DAPs 来提取事件 proposal 。为了可以得到交叉重叠的 segment ，对视频特征使用不同的 stride（分别为1、2、4和8）来采样输入到DAPs模型中，这样就得到了不同事件的 proposal 。

### caption模块

为了使用到上下文即其他 segment 的信息，本文 caption 模块首先使用了 attention 机制，对当前 segment 之前的 segment 特征加权得到一个 past 特征，再对当前 segment 之后的 segment 特征加权得到一个 future 特征，再和当前 segment 特征融合为一个整体特征，输入到 LSTM 网络中生成 caption 。在上下文的帮助下，每个 LSTM 拥有关于已经发生或将要发生的事件的知识，并可以相应地调整其生成的 caption 。

### 损失函数

本文使用两个独立的损失来训练 proposal 模块（$L_{prop}$）和 caption 模块（$L_{cap}$）。 proposal 模块预测了不同 proposal 长度的置信度，范围在0到1之间。 本文使用一个加权的交叉熵项来评估每个 proposal 的置信度，只将那些与 GT 有很高的IoU的建议传递给 caption 模块。本文在每个句子的所有单词中使用交叉熵损失,通过语言模型中的批量大小和序列长度来规范损失。 本文用$$\lambda _{1}=1.0$$来衡量caption损失的贡献，用$$\lambda _{2}=0.1$$来衡量proposal损失的贡献：

$$L=\lambda _{1}L_{cap}+\lambda _{2}L_{prop}$$

## 总结
本文作为 Dense video caption 任务的开山之作，详细的给出该任务的公式定义，提出了一种新的模型，并给出了用于该任务的大规模数据集，为后续工作建立了基准。