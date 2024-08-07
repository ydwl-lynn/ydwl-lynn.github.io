---
layout: post
title: 论文阅读 - Learning to (Learn at Test Time):RNNs with Expressive Hidden states
category: 论文阅读
tag: 博客
---

- *
{:toc}


## 起源

![fig1](/images/2024/TTT/1.png)

在图1左侧，可以观察到Mamba（当今最流行的RNN之一）的扩展性与强大的Transformer类似，这是自2020年的LSTM以来显示出的巨大进步。然而，在右侧，可以观察到与OpenAI相同的Mamba问题。平均而言，序列中靠后的token应该更容易预测，因为它们以更多信息为条件。

对Transformer来说确实如此，每个token索引的平均复杂度在其32k上下文中不断减少。相比之下，Mamba在16k后就出现了同样的情况。对于现有的RNN来说，这个结果代表了一个尴尬的现实——一方面，RNN（相对于Transformer）的主要优势就是它们的线性（相对于二次）复杂性。这种渐进优势实际上只会在长上下文中实现。另一方面，一旦上下文足够长，现有的RNN（如Mamba）就很难真正利用额外的条件信息。长上下文的困难是RNN层本质上的问题：与自注意力机制不同，RNN层必须将上下文压缩为固定大小的隐藏状态（它们虽然效率很高，但性能受限于其表达能力）。作为一种压缩启发式，更新规则需要发现成千上万甚至数百万个token之间的底层结构和关系。

注意力机制有一个KV缓存，它会随着时间的推移不断增长。这个状态不会压缩任何历史上下文，但随着上下文长度的增加，成本也会越来越高。

思考：既然这样，为什么不把上下文压缩到模型的权重中——就像LLM处理互联网数据那样呢？这种「隐藏状态模型」既能在时间上保持固定大小，又能大大增强表达能力。

因此，研究人员使用了自监督学习来更新隐藏状态的权重，对每个token进行一次梯度下降。在处理一个序列时，该状态已经在其上下文窗口中的token上「训练」过了。值得注意的是，隐藏状态只存在于端到端架构中的一层。其他组件，比如QKV投影矩阵，是在预训练期间通过标准的交叉熵目标函数学习的。因此，端到端架构实际上是在进行元学习，寻找压缩上下文的最佳方式，以便更好地预测下一个token，也就是在「学习如何在测试时学习」。


## TTL(Test-Time-Training)
受此启发，研究人员设计了一类新的序列建模层，其中隐藏状态是模型，更新规则是自监督学习的一个步骤。由于更新测试序列上隐藏状态的过程，相当于在测试时训练模型，因此此类新层称为测试时训练（TTT）层。研究人员引入两个简单的实例：TTT-Linear和TTT-MLP，其中隐藏状态分别是线性模型和两层MLP。TTT层可以集成到任何网络架构中并进行端到端优化，类似于RNN层和自注意力。TTT-Linear直接替代了注意力机制，解锁了具有表现力记忆的线性复杂度架构，使我们能够在上下文中训练包含数百万（未来可能是数十亿）个token的LLM。

TTT层在FLOP方面已经非常高效，研究人员则更进一步地提出了两项创新，使其在实际运行时间内也能保持高效。首先，与在常规训练中对mini-batch序列采取梯度步进以实现更好的并行性类似，他们也在TTT中使用了mini-batch的token。其次，研究人员为每个TTT mini-batch内的操作开发了一种对偶形式，以更好地利用现代GPU和TPU。这种对偶形式的输出与原始实现相当，但训练速度却快了5倍以上。如图2所示，TTT-Linear在8k上下文中比Transformer更快，并且与Mamba相当。

![fig2](/images/2024/TTT/2.png)



在将来，当我们对长视频进行建模时，就可以对帧进行密集采样，而不是采样1FPS了。这些密集帧对Transformer是一种负担，但对于TTT层来说，这却是一种福音！

## Transformer杀手——TTT

如图3所示，所有的序列建模层，都可以从将历史上下文存储到隐藏状态的角度来看待。比如，RNN层——如LSTM、RWKV和Mamba层——将上下文压缩成一个固定大小的状态，这个状态随时间变化。这种压缩带来了两种结果：优势是处理效率高，因为每个token的处理时间是恒定的。劣势是在处理长上下文时，RNN性能受限于隐藏状态的「表达能力」。

自注意力机制（Self-attention）也可以从如上角度来理解。不同之处在于，它的隐藏状态，通常称为键值（KV）缓存是一个随t增长的线性list。它可以存储所有的上下文，并且不会进行压缩，具有很好的表达能力，不过其处理时间随上下文长度线性增长。

![fig3](/images/2024/TTT/2.png)

因此，为了在长上下文中既保持效率，又具有表达能力，需要一个更好的「压缩启发式」（compression heuristic）方法。具体来说，就需要将数百万个token压缩成一个能有效捕捉其底层结构和关系的隐藏状态。

## TTT隐藏状态

研究人员的关键思想是，使用自监督学习来将历史上下文x1,x2,...xt压缩成一个隐藏状态st。方法是将上下文视为一个无标签数据集，而将状态视为一个模型。
具体来说，隐藏状态st现在等同于一个模型f的权重wt，这个模型f可以是线性模型、小型神经网络或其他任何形式。输出规则简单地表示为：
![fig4](/images/2024/TTT/s1.png)

直观讲，输出token就是由更新后权重wt的模型f对xt所做的预测。更新规则是在某个自监督损失ℓ上进行的一步梯度下降：
![fig5](/images/2024/TTT/s2.png)
其中学习率为η。从压缩的角度来看，每种启发式方法都需要决定记住/忘记哪些输入。W会记住那些产生大梯度的输入——直观地说，就是那些使W学习很多的输入。

ℓ的一种选择是重构xt本身。为了使学习问题变得非平凡，作则首先将xt处理成一个被破坏的输入xt~，然后优化：
![fig6](/images/2024/TTT/s3.png)

类似于去噪自编码器，f需要发现xt各维度之间的相关性，以便从部分信息xt~中重构出xt。

如图4所示，梯度下降能够减少ℓ，但无法将其降至零。
![fig4](/images/2024/TTT/4.png)

与其他RNN层和自注意力机制一样，研究人员将输入序列x1,x2,...,xT映射到输出序列z1,z2,...,zT的算法可以被编程到序列建模层的前向传播中，使用上述的隐藏状态、更新规则和输出规则。即使在测试时，新层仍然为每个输入序列训练一个不同的权重序列w1,w2...,wT。因此，研究人员将其称之为测试-时间训练层（TTT）。

