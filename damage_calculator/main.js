// ========================================
// 攻撃タイプ列挙型
// ========================================
var AttackType = {
    BODY: 0,
    ASSAULT_RIFLE: 2,
    SNIPER: 3,
    BAZOOKA: 4,
};
Object.freeze(AttackType);

// ========================================
// 標的タイプ列挙型
// ========================================
var TargetType = {
    HUMAN: '人',
    CLOTH: '服',
    THING: '物',    
};
Object.freeze(TargetType);


// ========================================
// 標的
// ========================================
function Target (name, hp, type) {
    this.name = name;
    this.hp   = hp;    
    this.type = type;
}

(function (TargetFtbl) {
    TargetFtbl.toString = function () {
        var mes_list = [];
        mes_list.push(this.name);
        mes_list.push('標的タイプ: ' + this.type);
        mes_list.push('HP: ' + this.hp);
        return mes_list.join('\n');
    };

    TargetFtbl.doneAttack = function (attack, buff_list) {
        var target = this;        
        if (!attack) {
            return target;
        }
        
        var hp = target.hp;
        var damage = attack.getValueByType(this.type);
        
        // ダメージにバフを適用する
        buff_list.forEach(function (buff) {
            damage = buff.apply(damage);
        });

        hp -= damage;

        return new Target(target.name, hp, target.type);
    };
})(Target.prototype);


// ========================================
// 火力タプル
// 対人、対服、対物
// ========================================
function AttackTuple (human, cloth, thing) {
    this[TargetType.HUMAN] = human;
    this[TargetType.CLOTH] = cloth;
    this[TargetType.THING] = thing;
}

(function (AttackTupleFtbl) {
    AttackTupleFtbl.toString = function () {
        var mes_list = [];

        for(var target_type_enum in TargetType) {
            var target_type = TargetType[target_type_enum];
            mes_list.push('対' + target_type + this[target_type]); 
        }

        return mes_list.toString();
        
    };

})(AttackTuple.prototype);

// ========================================
// 攻撃
// ========================================
function Attack (name, attack_tuple, type) {
    this.name         = name;
    this.attackTuple_ = attack_tuple;
    this.type         = type;
}

(function (AttackFtbl) {
    // ターゲット種別のダメージを返す
    AttackFtbl.getValueByType = function (target_type) {
        return this.attackTuple_[target_type];
    };

    AttackFtbl.toString = function () {
        var str = "";
        str += this.name;
        str += ' (';
        str += this.attackTuple_.toString();
        str += ')';

        return str;
    };
})(Attack.prototype);



// ========================================
// 特攻/軽減基底
// ========================================
function BuffBase (name, value) {
    this.name  = name;
    this.value = value;
}

(function (BuffBaseFtbl) {
    // パフを適用するか否かの述語関数
    // virtual
    BuffBaseFtbl.pred = function (target, attack) {
        return true;
    };

    BuffBaseFtbl.apply = function (damage) {
        // 要検証
        return Math.floor(damage * (100 + this.value) / 100);
    };

    BuffBaseFtbl.toString = function () {
        var sign = this.value < 0 ? '' : '+';
        return this.name + ' ' + sign + this.value + '%';
    };
})(BuffBase.prototype);


// ========================================
// 部位特攻
// ========================================
function PartBuff (name, value) {
    BuffBase.call(this, name, value);
}
Object.setPrototypeOf(PartBuff.prototype, BuffBase.prototype);

// ========================================
// 攻撃種別特攻
// ========================================
function AttackBuff (name, value, type) {
    BuffBase.call(this, name, value);
    this.type = type;
}

(function (AttackBuffFtbl, BuffBaseFtbl) {
    Object.setPrototypeOf(AttackBuffFtbl, BuffBaseFtbl);


    AttackBuffFtbl.pred = function (target, attack) {
        return this.type === attack.type;
    };
    
})(AttackBuff.prototype, BuffBase.prototype);

// ========================================
// 対物特攻
// ========================================
function ThingBuff (name, value) {
    BuffBase.call(this, name, value);
}

(function (ThingBuffFtbl, BuffBaseFtbl) {
    Object.setPrototypeOf(ThingBuffFtbl, BuffBaseFtbl);

    ThingBuffFtbl.pred = function (target, attack) {
        return target.type === TargetType.THING;
    };
    
})(ThingBuff.prototype, BuffBase.prototype);


// ========================================
// 結果エレメント
// ========================================
function ResultElement (target, attack, buff_list) {
    this.attack_ = attack;
    // バフリストから、適用条件を満たすものを拾う
    this.buffList_ = buff_list.filter(function (buff) {
        return buff.pred(target, attack);
    });

    var target_damage_done = this.target_ = target.doneAttack(attack, buff_list);

    this.damage_ = target.hp - target_damage_done.hp;
}

(function (ResultElementFtbl) {
    ResultElementFtbl.toString = function () {
        var str = '';
        
        var mes_list = [];
        if (this.attack_) {
            mes_list.push('■ 攻撃');
            mes_list.push('　' + this.attack_);
        }
        if (this.buffList_.length) {
            mes_list.push('■ 補正');
            var buff_string_list = this.buffList_.map(function (buff) {
                return '　' + buff.toString();
            });
            mes_list = mes_list.concat(buff_string_list);
        }
        if (this.damage_) {
            mes_list.push('■ ダメージ');                        
            mes_list.push('　' + this.damage_);
        }

        mes_list.push('■ 残HP');
        mes_list.push('　' + this.target_.hp);
        
        str += mes_list.join('\n');

        return str;
    };

    ResultElementFtbl.getTarget = function () {
        return this.target_;
    };
})(ResultElement.prototype);

// ========================================
// 結果
// ========================================
function Result () {
    this.list_ = [];
}

(function (ResultFtbl) {
    ResultFtbl.push = function (result_element) {
        this.list_.push(result_element);
    };
    ResultFtbl.pushed = function (result_element) {
        var ret = new Result();
        ret.list_ = ret.list_.concat(this.list_).concat(result_element);
        return ret;
    };

    ResultFtbl.toString = function () {
        return this.list_.join('\n----------------------------------------\n');
    };

    ResultFtbl.getLastElement = function () {
        var list = this.list_;
        var last_element = list[list.length - 1];
        return last_element;
    };
    
    ResultFtbl.getTarget = function () {
        return this.getLastElement().getTarget();
    };
    
    ResultFtbl.getHP = function () {
        return this.getTarget().hp;
    };
    ResultFtbl.getStep = function () {
        return this.list_.length;
    };
})(Result.prototype);

Result.sortPred = function (r1, r2) {
    // HP降順
    var det_hp = r2.getHP() - r1.getHP();
    if (det_hp !== 0) {
        return det_hp;
    }

    // ステップ数少ない順
    var det_length = r1.getStep() - r2.getStep();
    return det_length;
};



// ========================================
// 問題をとく関数
// ========================================
function for_attack_list (all_attack_list, two_attack_list, callback) {
    for (var i = 0; i < two_attack_list.length; ++i) {
        for (var j = i; j < two_attack_list.length; ++j) {
            var attack_list = all_attack_list.concat();
            attack_list.push(two_attack_list[i]);
            attack_list.push(two_attack_list[j]);
            callback(attack_list);
        }
    }
}
function for_buff_list (all_buff_list, one_buff_list, callback) {
    one_buff_list.forEach(function (one_buff) {
        var buff_list = all_buff_list.concat(one_buff);
        callback(buff_list);
    });
}

function solve_helper (target, attack_list, buff_list, hp_pred) {
    // 選べる攻撃手段は3つ + 近接
    
    // 動的計画法
    // インデクスは[0: hp]
    var hp_to_result_from = [];
    var hp_to_flg = [];

    // 初期値
    var result_init = new Result();
    result_init.push(new ResultElement(target, null, []));
    hp_to_result_from[target.hp] = result_init;
    hp_to_flg[target.hp] = true;

    var answer_list = [];

    for (var i = 0; i < 100 && hp_to_result_from.length > 0; ++i) {
        var hp_to_result_to = [];

        // 攻撃を選択する
        attack_list.forEach(function (attack) {
            // 動的計画法
            hp_to_result_from.forEach(function (result, hp) {
                hp = Number(hp);
                if (hp <= 0) {
                    return;
                }

                // 攻撃とバフを作用させる
                var target = result.getTarget();
                var result_element = new ResultElement(target, attack, buff_list);
                var target_new = result_element.getTarget();
                var hp_new = target_new.hp;

                // 重複解は捨てる
                if (hp_to_flg[hp_new]) {
                    return;
                }

                var result_new = result.pushed(result_element);
                hp_to_result_to[hp_new] = result_new;
                // 調査済マーク
                hp_to_flg[hp_new] = true;

                // 条件を満足していれば、解に追加
                if (hp_pred(hp_new)) {
                    answer_list.push(result_new);
                }
            });
        });
        // 更新
        hp_to_result_from = hp_to_result_to;
    }

    return answer_list;
}

function solve (target, all_attack_list, two_attack_list, all_buff_list, one_buff_list, opt_hp_pred) {
    var hp_pred = opt_hp_pred || function (hp) {
        return hp === 0;
    };

    var answer_list = [];
    
    for_attack_list(all_attack_list, two_attack_list, function (attack_list) {
        for_buff_list(all_buff_list, one_buff_list, function (buff_list) {
            answer_list = answer_list.concat(solve_helper(target, attack_list, buff_list, hp_pred));
        });
    });

    // 解答を表示

    console.log(target.toString());
    
    if (answer_list.length === 0) {
        console.log('解なし');
        return;
    }
    
    answer_list.sort(Result.sortPred);
    answer_list.forEach(function (answer, i) {
        console.log('========================================');
        console.log('Answer #' + (i + 1) + ' / HP ' + answer.getHP() + ' / ' + answer.getStep() + 'steps');
        console.log(answer.toString());
    });

}


// ========================================
// entry point
// まだてきとう
// ========================================

// ----------------------------------------
// 調査対象の標的
// ----------------------------------------
var target = new Target('9-3 メイド服モブ', 720, TargetType.HUMAN);

// ----------------------------------------
// 必ず入れる攻撃手段
// ... キャラ固有装備等
// ----------------------------------------
var all_attack_list = [
    // new Attack('シャドウスナイパー',   new AttackTuple(270, 270, 135), AttackType.SNIPER),
    new Attack('シャドウスナイパー改', new AttackTuple(390, 390, 195), AttackType.SNIPER),    
];

// ----------------------------------------
// 選択する攻撃手段
// ... 固有装備以外の、残りの装備枠2枠
// ----------------------------------------
var two_attack_list = [
    new Attack('XN8-R lv1', new AttackTuple(48, 48, 12), AttackType.ASSAULT_RIFLE),
    new Attack('XN8-R lv2', new AttackTuple(72, 72, 18), AttackType.ASSAULT_RIFLE),
];

// ----------------------------------------
// 必ず適用するバフ
// 例えば、サポーターが早乙女陽希に決定している場合の
// 「バズーカ対物特攻+35%」等
// ----------------------------------------
var all_buff_list = [];

// ----------------------------------------
// どれかひとつ適用するバフ
// 攻撃部位による補正等
// あるいは、サポーター能力を決めかねている場合など
// ----------------------------------------
var buff_head = new PartBuff('頭部', 100);
var buff_leg  = new PartBuff('脚部', -25);
var one_buff_list = [
    buff_head,
    buff_leg,    
];

// ----------------------------------------
// 解の条件
// ----------------------------------------
var hp_pred = function (hp) {
    return -10 <= hp && hp <= 0;
};

solve(target, all_attack_list, two_attack_list, all_buff_list, one_buff_list, hp_pred);
