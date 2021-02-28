const compileUtil={

  getVal(expr,vm){
    return expr.split('.').reduce((data,currentVal)=>{
      // console.log(currentVal);
      return data[currentVal]
    },vm.$data)
  },

  setVal(expr,vm,inputVal){
    return expr.split('.').reduce((data,currentVal)=>{
      // console.log(currentVal);
       data[currentVal] = inputVal
    },vm.$data)
  },

  getContentVal(expr,vm){
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1],vm);
    })
  },

  text(node,expr,vm){  //expr:msg  vm:当前实例
    let value;
    // console.log(expr);
    if(expr.indexOf('{{')!==-1){
       value= expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        new Watcher(vm,args[1],()=>{
          this.updater.textUpdater(node,this.getContentVal(expr,vm))
        })
        // console.log(args);
        return this.getVal(args[1],vm);
      })
    }else{
      // console.log(expr);
      value=this.getVal(expr,vm);
      // console.log(value);
    }
    // expr即为与v-绑定的值
    this.updater.textUpdater(node,value)
  },

  html(node,expr,vm){
   
    let value=this.getVal(expr,vm);
    new Watcher(vm,expr,(newVal)=>{
      this.updater.htmlUpdater(node,newVal)
    })
    this.updater.htmlUpdater(node,value);
  },

  model(node,expr,vm){
    const value=this.getVal(expr,vm);
    // 绑定更新函数 数据=>视图
    new Watcher(vm,expr,(newVal)=>{
      this.updater.modelUpdater(node,newVal)
    })
    // 视图=>数据=>视图
    node.addEventListener('input',(e)=>{
      //设置值
      this.setVal(expr,vm,e.target.value)
    })
    this.updater.modelUpdater(node,value);
  },

  on(node,expr,vm,eventName){
    let fn=vm.$options.methods && vm.$options.methods[expr]
    node.addEventListener(eventName,fn.bind(vm),false)
  },

  // 更新的函数
  updater:{
    htmlUpdater(node,value){
      node.innerHTML=value
    },
    textUpdater(node,value){
      node.textContent=value;
    },
    modelUpdater(node,value){
      node.value=value
    },
  }
};


class Compile{
  constructor(el,vm){
    // 判断el是否为元素节点，不是则获取其值
    this.el=this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    // 1.获取文档碎片对象 放入内存中减少页面的回流重绘
   const fragment = this.node2Fragment(this.el);
    // console.log(fragment);
    // 2.编译fragment模板
    this.compile(fragment);
    // 3.追加子元素到根元素
    this.el.appendChild(fragment);
  };

  // 编译fragment模板的方法
  compile(fragment){
    // 1.获取到每一个子节点
    const childNodes=fragment.childNodes;
    [...childNodes].forEach(child=>{
      if(this.isElementNode(child)){
        // 是元素节点
        // 编译元素节点
        this.compileElement(child);
      }else{
        // 文本节点
        // 是否编译文本节点
        this.compileText(child);
      }

      if(child.childNodes && child.childNodes.length){
        this.compile(child);
      }

    })
  };

  // 编译元素节点的方法
  compileElement(node){
    const attributes=node.attributes;
    [...attributes].forEach(attr=>{
      const {name,value}=attr;
      if(this.isDirective(name)){ //判断是否为一个指令
        const [ ,dirctive]=name.split('-');
        // console.log(dirctive);
        const[dirName,eventName] = dirctive.split(':');
        // 更新数据，数据驱动视图
        compileUtil[dirName](node,value,this.vm,eventName);
        // 删除有指令的标签上的属性
        node.removeAttribute('v-' + dirctive);
      }else if(this.isEventName(name)){
       let[ ,eventName]= name.split('@');
       compileUtil['on'](node,value,this.vm,eventName);
      }
    })
  }

  // 是否编译文本节点的方法
  compileText(node){
    // 编译{{}}
    const content =node.textContent;
    // console.log(content);
    if(/\{\{(.+?)\}\}/.test(content)){
      compileUtil['text'](node,content,this.vm)
    }
  }

  isEventName(attrName){
    return attrName.startsWith('@')
  }

  isDirective(attrName){
    return attrName.startsWith('v-')
  }

  // 获取所有孩子节点
  node2Fragment(el){
    // 1.创建文档碎片
    const f=document.createDocumentFragment();
    let firstChild;
    // 2.遍历取出所有节点加入f中
    while(firstChild=el.firstChild){
      f.appendChild(firstChild);
    }
    return f;
  }
  
  // 判断是否为元素节点的方法
  isElementNode(node){
    return node.nodeType === 1;
  }
}

class Myvue{
  
  constructor(options){ //options即是new Myvue时传入的参数
    this.$el=options.el; //将这些参数挂载为自己的属性
    this.$data=options.data;
    this.$options=options;
    if(this.$el){ //判断是否有传入值
      // 1.实现一个数据观察者
      new Observer(this.$data);
      // 2.实现一个指令解析器
      new Compile(this.$el,this);//在Compile中传入当前挂载dom节点和Myvue的实例vm
      this.proxyData(this.$data)
    }
  }

  proxyData(data){
    for(const key in data){
      Object.defineProperty(this,key,{
        get(){
          return data[key];
        },
        set(newVal){
          data[key]=newVal;
        }
      })
    }
  }
}