function createRenderer(options) {
    const {
        createElement,
        insert,
        setElementText,
        patchProps,
        createText,
        setText,
        createComment
    } = options;


    // 挂载
    function mountElement(vnode, container, anchor) {
        let el = vnode.el = createElement(vnode.type);
        // 设置属性
        if (vnode.props) {
            for (const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key]);
            }
        }

        // 子节点
        if (typeof vnode.children === 'string') {
            setElementText(el, vnode.children);
        } else if (Array.isArray(vnode.children)) {
            vnode.children.forEach(child => {
                patch(null, child, el);
            })
        }
        insert(el, container, anchor);

    }

    // 卸载
    function unmount(vnode) {
        const parent = vnode.el.parentNode;
        if (parent) {
            parent.removeChild(vnode.el);
        }
    }

    // 对元素打补丁
    function patchElement(n1, n2) {
        const el = n2.el = n1.el;
        const oldProps = n1.props;
        const newProps = n2.props;

        // 第一步：更新 props
        for (const key in newProps) {
            if (newProps[key] !== oldProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key]);
            }
        }

        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, oldProps[key], null);
            }
        }

        // 第二步：更新 children
        patchChildren(n1, n2, el);

    }

    // 对元素的孩子打补丁
    function patchChildren(n1, n2, container) {
        // 判断新子节点的类型是否是文本节点
        if (typeof n2.children === 'string') {
            // 旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
            // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
            if (Array.isArray(n1.children)) {
                n1.children.forEach((c) => unmount(c));
            }
            // 最后将新的文本节点内容设置给容器元素
            setElementText(container, n2.children);
        } else if (Array.isArray(n2.children)) {
            // 说明新子节点是一组子节点
            // 判断旧子节点是否也是一组子节点
            if (Array.isArray(n1.children)) {
                const oldChildren = n1.children;
                const newChildren = n2.children;
                // 用来存储寻找过程中遇到的最大索引值
                let lastIndex = 0;
                for (let i = 0; i < newChildren.length; i++) {
                    const newVNode = newChildren[i];
                    // 在第一层循环中定义变量 find，代表是否在旧的一组子节点中找到可复用的节点
                    // 初始值为 false，代表没找到
                    let find = false

                    for (let j = 0; j < oldChildren.length; j++) {
                        const oldVNode = oldChildren[j];
                        // 如果找到了具有相同 key 值的两个节点，说明可以复用，但仍然需要调用patch函数更新
                        if (newVNode.key === oldVNode.key) {
                            // 一旦找到可复用的节点，则将变量 find 的值设为 true
                            find = true;
                            patch(oldVNode, newVNode, container);
                            if (j < lastIndex) {
                                // 代码运行到这里，说明 newVNode 对应的真实 DOM 需要移动
                                // 先获取 newVNode 的前一个 vnode，即 prevVNode
                                const prevVNode = newChildren[i - 1];

                                if (prevVNode) {
                                    // 所以我们需要获取 prevVNode 所对应真实 DOM 的下一个兄弟节点，并将其作为锚点
                                    const anchor = prevVNode.el.nextSibling;
                                    // 也就是 prevVNode 对应真实 DOM 的后面
                                    insert(newVNode.el, container, anchor)
                                }

                            } else {
                                // 则更新 lastIndex 的值
                                lastIndex = j;
                            }
                            break;
                        }

                    }
                    if (!find) {
                        const prevVNode = newChildren[i - 1];
                        let anchor = null;
                        if (prevVNode) {
                            anchor = prevVNode.el.nextSibling;
                        } else {
                            anchor = container.firstChild;
                        }
                        // 挂载 newVNode
                        patch(null, newVNode, container, anchor);
                    }
                }
                for (let i = 0; i < oldChildren.length; i++) {
                    const oldVNode = oldChildren[i];
                    // 拿旧子节点 oldVNode 去新的一组子节点中寻找具有相同 key 值的节点
                    const has = newChildren.find(vnode => vnode.key === oldVNode.key);
                    if (!has) {
                        // 如果没有找到具有相同 key 值的节点，则说明需要删除该节点
                        // 调用 unmount 函数将其卸载
                        unmount(oldVNode);
                    }
                }
            } else {
                // 旧子节点要么是文本子节点，要么不存在
                // 但无论哪种情况，我们都只需要将容器清空，然后将新的一组子节点逐个挂载
                setElementText(container, '');
                n2.children.forEach((c) => patch(null, c, container));
            }
        } else {
            // 代码运行到这里，说明新子节点不存在
            // 旧子节点是一组子节点，只需逐个卸载即可
            if (Array.isArray(n1.children)) {
                // 将旧的一组子节点全部卸载
                n1.children.forEach((c) => unmount(c));
            } else if (typeof n1.children === 'string') {
                // 旧子节点是文本子节点，清空内容即可
                setElementText(container, '');
            }
            // 如果也没有旧子节点，那么什么都不需要做
        }
    }

    // 双端diff
    // function patchKeyedChildren(n1, n2, container) {
    //     const oldChildren = n1.children;
    //     const newChildren = n2.children;
    //     // 四个索引值
    //     let oldStartIdx = 0;
    //     let oldEndIdx = oldChildren.length - 1;
    //     let newStartId = 0;
    //     let newEndIdx = newChildren.length - 1;
    //     // 四个索引指向的 vnode 节点
    //     let oldStartVNode = oldChildren[oldStartIdx];
    //     let oldEndVNode = oldChildren[oldEndIdx];
    //     let newStartVNode = newChildren[newStartId];
    //     let newEndVNode = newChildren[newEndIdx];

    //     while (oldStartIdx <= oldEndIdx && newStartId <= newEndIdx) {
    //         // 如果头尾部节点为 undefined，则说明该节点已经被处理过了，直接跳到下一个位置
    //         if (!oldStartVNode) {
    //             oldStartVNode = oldChildren[++oldStartIdx];
    //         } else if (!oldEndVNode) {
    //             oldEndVNode = oldChildren[--oldEndIdx];
    //         }
    //         if (newStartVNode.key === oldStartVNode.key) {
    //             patch(oldStartVNode, newStartVNode, container);
    //             newStartVNode = newChildren[++newStartId];
    //             oldStartVNode = oldChildren[++oldStartIdx];
    //         } else if (newEndVNode.key === oldEndVNode.key) {
    //             patch(oldEndVNode, newEndVNode, container);
    //             newEndVNode = newChildren[--newEndIdx];
    //             oldEndVNode = oldChildren[--oldEndIdx];
    //         } else if (newEndVNode.key === oldStartVNode.key) {
    //             patch(oldStartVNode, newEndVNode, container);
    //             // 将旧的一组子节点的头部节点对应的真实 DOM 节点 oldStartVNode.el移动到旧的一组子节点的尾部节点对应的真实DOM节点后面
    //             insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling);
    //             oldStartVNode = oldChildren[++oldStartIdx];
    //             newEndVNode = newChildren[--newEndIdx];
    //         } else if (newStartVNode.key === oldEndVNode.key) {
    //             patch(oldStartVNode, newEndVNode, container);
    //             insert(oldEndVNode.el, container, oldStartVNode.el);
    //             newStartVNode = newChildren[++newStartId];
    //             oldEndVNode = oldChildren[--oldEndIdx];
    //         } else {
    //             // 遍历旧 children，试图寻找与 newStartVNode 拥有相同 key 值的元素
    //             const idxInOld = oldChildren.findIndex(
    //                 node => node.key === newStartVNode.key
    //             );
    //             // idxInOld 大于 0，说明找到了可复用的节点，并且需要将其对应的真实DOM移动到头部
    //             if (idxInOld > 0) {
    //                 // idxInOld 位置对应的 vnode 就是需要移动的节点
    //                 const vnodeToMove = oldChildren[idxInOld];
    //                 patch(vnodeToMove, newStartVNode, container);
    //                 // 将 vnodeToMove.el 移动到头部节点 oldStartVNode.el 之前,因此使用后者作为锚点
    //                 insert(vnodeToMove.el, container, oldStartVNode.el);
    //                 // 由于位置 idxInOld 处的节点所对应的真实 DOM 已经移动到了别处，因此将其设置为 undefined
    //                 oldChildren[idxInOld] = undefined;

    //             } else {
    //                 patch(null, newStartVNode, container, oldStartVNode.el)
    //             }
    //             newStartVNode = newChildren[++newStartId];
    //         }
    //     }

    //     // 循环结束后检查索引值的情况,防止遗漏节点
    //     if (oldEndIdx < oldStartIdx && newStartId < newEndIdx) {
    //         // 如果满足条件，则说明有新的节点遗留，需要挂载它们
    //         for (let i = newStartId; i < newEndIdx; i++) {
    //             patch(null, newChildren[i], container, oldStartVNode.el);
    //         }
    //     } else if (newEndIdx < newStartId && oldStartIdx <= oldEndIdx) {
    //         // 移除操作
    //         for (let i = oldStartIdx; i < oldEndIdx; i++) {
    //             unmount(oldChildren[i]);
    //         }
    //     }
    // }

    function patchKeyedChildren() {
        const newChildren = n2.children;
        const oldChildren = n1.children;
        // 更新相同的前置节点
        // 索引 j 指向新旧两组子节点的开头
        let j = 0;
        let oldVNode = oldChildren[j];
        let newVNode = newChildren[j];
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container);
            j++;
            oldVNode = oldChildren[j];
            newVNode = newChildren[j];
        }

        // 更新相同的后置节点
        let oldEnd = oldChildren.length - 1;
        let newEnd = newChildren.length - 1;
        oldVNode = oldChildren[oldEnd];
        newVNode = newChildren[newEnd];
        // while 循环从后向前遍历，直到遇到拥有不同 key 值的节点为止
        while (oldVNode.key === newVNode.key) {
            patch(oldVNode, newVNode, container);
            oldEnd--;
            newEnd--;
            oldVNode = oldChildren[oldEnd];
            newVNode = newChildren[newEnd];
        }


        // 旧节点处理完了
        if (j > oldEnd && j <= newEnd) {
            // 锚点的索引
            const anchorIndex = newEnd + 1;
            // 锚点元素
            const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex] : null;
            // 采用 while 循环，调用 patch 函数逐个挂载新增节点
            while (j < newEnd) {
                patch(null, newChildren[j++], container, anchor);
            }
        } else if (j > newEnd && j < oldEnd) {
            // 新节点处理完了
            // j -> oldEnd 之间的节点应该被卸载
            while (j <= oldEnd) {
                unmount(oldChildren[j++]);
            }
        } else {
            // 程序到这里说明无法简单地通过挂载新节点或者卸载已经不存在的节点来完成更新
            // 构造 source 数组
            // 新的一组子节点中剩余未处理节点的数量
            const count = newEnd - j + 1;
            // source 数组将用来存储新的一组子节点中的节点在旧的一组子节点中的位置索引
            const source = new Array(count);
            source.fill(-1);

            // oldStart 和 newStart 分别为起始索引，即 j
            const oldStart = j;
            const newStart = j;
            // moved表是否需要移动节点，思路和简单DIff算法的思路差不多，递增的序列说明不用移动节点，
            let moved = false;
            // 遍历旧的一组子节点的过程中遇到的最大索引值 k
            let pos = 0;
            // 构建索引表
            const keyIndex = {};
            for (let i = newStart; i <= newEnd; i++) {
                keyIndex[newChildren[i].key] = i;
            }
            // patched代表更新过的节点数量
            let patched = 0
                // 遍历旧的一组子节点中剩余未处理的节点
            for (let i = oldStart; i <= oldEnd; i++) {
                oldVNode = oldChildren[i];
                // 如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
                if (patched < count) {
                    // 通过索引表快速找到新的一组子节点中具有相同 key 值的节点位置
                    const k = keyIndex[oldVNode.key];
                    if (typeof k !== 'undefined') {
                        newVNode = newChildren[k];
                        patch(oldVNode, newVNode, container);
                        // 每更新一个节点，都将 patched 变量 +1
                        patched++
                        source[k - newStart] = i;
                        // 判断节点是否需要移动
                        if (k < pos) {
                            moved = true;
                        } else {
                            pos = k;
                        }
                    } else {
                        unmount(oldVNode);
                    }
                } else {
                    // 如果更新过的节点数量大于需要更新的节点数量，则卸载多余的节点
                    unmount(oldVNode);
                }
            }

            if (moved) {
                // // 计算最长递增子序列
                const seq = lis(sources);
                // s 指向最长递增子序列的最后一个元素
                let s = seq.length - 1;
                // i 指向新的一组子节点的最后一个元素
                let i = count - 1;
                for (i; i >= 0; i--) {

                    if (source[i] === -1) {
                        // 说明索引为 i 的节点是全新的节点， 应该将其挂载
                        // 该节点在新 children 中的真实位置索引
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        // 该节点的下一个节点的位置索引
                        const nextPos = pos + 1;
                        // 锚点
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        // 挂载
                        patch(null, newVNode, container, anchor);
                    } else if (i !== seq[s]) {
                        // 如果节点的索引 i 不等于 seq[s] 的值，说明该节点需要移动
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];
                        const nextPos = pos + 1;
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
                        // 移动
                        insert(newVNode.el, container, anchor);

                    } else {
                        // 当 i === seq[s] 时，说明该位置的节点不需要移动
                        // 只需要让 s 指向下一个位置
                        s--;
                    }
                }
            }

        }
    }

    // 打补丁
    function patch(n1, n2, container, anchor) {
        // 如果渲染的是不同类型的标签，由于不每个标签都有特有的属性，因此需要将旧的卸载，再挂载新的标签
        if (n1 && n1.type !== n2.type) {
            unmount(n1);
            // n1 = null保证后续的挂载操作
            n1 = null;
        }
        const { type } = n2;
        // 如果 n2.type 的值是字符串类型，则它描述的是普通标签元素
        if (typeof type === 'string') {
            if (!n1) {
                mountElement(n2, container, anchor);
            } else {
                patchElement(n1, n2);
            }
        } else if (typeof type === 'object') {
            // 如果 n2.type 的值的类型是对象，则它描述的是组件
        } else if (type === Text) {
            // 文本节点
            // 如果没有旧节点，则进行挂载
            if (!n1) {
                const el = n2.el = createText(n2.children);
                // 将文本节点插入到容器中
                insert(el, container);
            } else {
                // 如果旧 vnode 存在，只需要使用新文本节点的文本内容更新旧文本节点即可
                const el = n2.el = n1.el;
                if (n2.children !== n1.children) {
                    setText(el, n2.children)
                    e1.nodeValue = n2.children;
                }
            }
        } else if (type === Comment) {
            // 注释节点
            // 如果没有旧节点，则进行挂载
            if (!n1) {
                const el = n2.el = createComment(n2.children);
                // 将文本节点插入到容器中
                insert(el, container);
            } else {
                // 如果旧 vnode 存在，只需要使用新文本节点的文本内容更新旧文本节点即可
                const el = n2.el = n1.el;
                if (n2.children !== n1.children) {
                    setText(el, n2.children);
                }
            }


        }
        if (type === Fragment) {
            if (!n1) {
                // 如果旧 vnode 不存在，则只需要将 Fragment 的 children 逐个挂载即可
                n2.children.forEach(c => patch(null, c, container));
            } else {
                // 如果旧 vnode 存在，则只需要更新 Fragment 的 children 即可
                patchChildren(n1, n2, container)
            }
        }
    }

    function render(vnode, container) {
        if (vnode) {
            // 打补丁
            patch(container._vnode, vnode, container)
        } else {
            if (container._vnode) {
                // 卸载vnode
                unmount(container._vnode);
            }
        }
        container._vnode = vnode;
    }
    return {
        render
    }
}