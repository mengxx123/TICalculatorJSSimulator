// TI calculator simulator
// Ken Shirriff, http://righto.com/ti
// Based on patent US3934233
//
// This file simulates the CPU chip

// sinclair is true for the Sinclair Scientific (0805) version of the CPU.
var Cpu = function(model, masks, sinclair) {
  this.model = model;

  // Gets the mask number from the current instruction in the model
  this.getMaskNum = function() {
    return this.model.rom[this.model.address] & 0xf;
  };

  // Indicates opcodes for which the constant should be displayed
  var opsWithK = {
	1: 'AAKA',
	2: 'AAKC',
	5: 'ACKA',
	6: 'ACKB',
	9: 'SAKA',
	11: 'SCKC',
	13: 'CAK',
	15: 'CCK',
	16: 'AKA',
	17: 'AKB',
	18: 'AKC',
	26: 'AKCN',
	27: 'AAKAH',
	28: 'SAKAH',
	29: 'ACKC',
  };

  // Get the mask vector associated with the current instruction's mask
  // Entries are ' ' if not masked, '*' if masked, n if mask and constant.
  // Note that S10 is in mask[0]
  // Returns null if mask is not appropriate for this instruction
  this.getMask = function() {
    var instruction = this.model.rom[this.model.address];
    var classBits = instruction >> 9;
    var opcode = (instruction >> 4) & 0x1f;
    if (classBits == 3 || (classBits == 2 && opcode > 18 &&
	  opcode != opcode != 21 && opcode != 22)) {
      var mask = masks[this.getMaskNum()];
      var maskVec = [];
      for (var i = 0; i <= 10; i++) {
	if (mask[i] === ' ') {
	  maskVec.push(mask[i]);
	} else if (classBits == 3 && opsWithK[opcode]) {
	  // Register instruction
	  maskVec.push(parseInt(mask[i]));
	} else {
	  maskVec.push('*');
	}
      }
      return maskVec;
    } else {
      return null;
    }
  }

  this.step = function() {
    var instruction = this.model.rom[this.model.address];
    var classBits = instruction >> 9;
    var opcode = (instruction >> 4) & 0x1f;
    var nextAddress = this.model.address + 1;
    if (classBits == 3) {
      // Register instruction
      var maskBits = instruction & 0xf;
      switch (opcode) {
	case 0: // AABA: A+B -> A
	  this.add(this.model.a, this.model.b, this.model.a);
	  break;
	case 1: // AAKA: A+K -> A
	  this.add(this.model.a, this.getMask(), this.model.a);
	  break;
	case 2: // AAKC: A+K -> C
	  this.add(this.model.a, this.getMask(), this.model.c);
	  break;
	case 3:
	  if (sinclair) { // ACBB C+B -> B
	    this.add(this.model.c, this.model.b, this.model.b);
	  } else { // ABOA: B -> A
	    this.copy(this.model.b, this.model.a);
	  }
	  break;
	case 4: // ABOC: B -> C
	  this.copy(this.model.b, this.model.c);
	  break;
	case 5: // ACKA: C+K -> A
	  this.add(this.model.c, this.getMask(), this.model.a);
	  break;
	case 6: // AKCB: C+K -> B
	  this.add(this.model.c, this.getMask(), this.model.b);
	  break;
	case 7: // SABA: A-B -> A
	  this.sub(this.model.a, this.model.b, this.model.a);
	  break;
	case 8: // SABC: A-B -> C
	  this.sub(this.model.a, this.model.b, this.model.c);
	  break;
	case 9: // SAKA: A-K -> A
	  this.sub(this.model.a, this.getMask(), this.model.a);
	  break;
	case 10: // SCBC: C-B -> C
	  this.sub(this.model.c, this.model.b, this.model.c);
	  break;
	case 11: // SCKC: C-K -> C
	  this.sub(this.model.c, this.getMask(), this.model.c);
	  break;
	case 12: // CAB: compare A-B
	  this.compare(this.model.a, this.model.b);
	  break;
	case 13: // CAK: compare A-K
	  this.compare(this.model.a, this.getMask());
	  break;
	case 14: // CCB: compare C-B
	  this.compare(this.model.c, this.model.b);
	  break;
	case 15: // CCK: compare C-K
	  this.compare(this.model.c, this.getMask());
	  break;
	case 16: // AKA: K -> A
	  this.copy(this.getMask(), this.model.a);
	  break;
	case 17: // AKB: K -> B
	  this.copy(this.getMask(), this.model.b);
	  break;
	case 18: // AKC: K -> C
	  this.copy(this.getMask(), this.model.c);
	  break;
	case 19: // EXAB: exchange A and B
	  this.exchange(this.model.a, this.model.b);
	  break;
	case 20: // SLLA: shift A left
	  this.sll(this.model.a);
	  break;
	case 21: // SLLB: shift B left
	  this.sll(this.model.b);
	  break;
	case 22: // SLLC: shift C left
	  this.sll(this.model.c);
	  break;
	case 23: // SRLA: shift A right
	  this.srl(this.model.a);
	  break;
	case 24: // SRLB: shift B right
	  this.srl(this.model.b);
	  break;
	case 25: // SRLC: shift C right
	  this.srl(this.model.c);
	  break;
	case 26: // AKCN: A+K -> A until key down on N or D11 [sic]
	  // Patent says sets condition if key down, but real behavior
	  // is to set condition if addition overflows (i.e. no key down)
	  this.add(this.model.a, this.getMask(), this.model.a);
	  if (this.model.keyStrobe == 'KN') {
	    // Advance to next instruction
	  } else if (this.model.dActive != 10) {
	    // Hold at current instruction and continue scan
	    nextAddress = this.model.address;
	  } else {
	    // For state d10, fall through
	  }
	  break;
	case 27:
	  if (sinclair) { // SCBA C-B -> A
	    this.sub(this.model.c, this.model.b, this.model.a);
	  } else { // AAKAH A+K -> A hex
	    this.add(this.model.a, this.getMask(), this.model.a, 1 /* hex */);
	    this.model.cc = 0;
	    this.model.ccMeaning = '';
	  }
	  break;
	case 28:
	  if (sinclair) { // SCKB C-K -> B
	    this.sub(this.model.c, this.getMask(), this.model.b);
	  } else { // SAKAH A-K -> A hex
	    this.sub(this.model.a, this.getMask(), this.model.a, 1 /* hex */);
	    this.model.cc = 0;
	    this.model.ccMeaning = '';
	  }
	  break;
	case 29: // ACKC: C+K -> C
	  this.add(this.model.c, this.getMask(), this.model.c);
	  break;
	case 30: 
	  if (sinclair) { // AABC A+B -> C
	    this.add(this.model.a, this.model.b, this.model.c);
	    break;
	  }
	case 31: 
	  if (sinclair) { // ACBC C+B -> C
	    this.add(this.model.c, this.model.b, this.model.c);
	    break;
	  }
	default:
	  alert('Bad instruction ' + instruction);
	  break;
      }
    } else if ((instruction >> 8) == 5) {
      // Flag instruction
      var maskBits = instruction & 0xf;
      switch (opcode) {
	case 16: // NOP
	  break;
	case 17: // WAITDK: wait for display key
	  this.model.display = 0;
	  if (this.model.keyPressed == 'DK') {
	    // Jump
	    nextAddress = instruction & 0x1ff;
	  } else {
	    // Hold address until DK pressed
	    nextAddress = this.model.address;
	  }
	  break;
	case 18: // WAITNO: wait for key or address register overflow
	  if (this.model.keyStrobe) {
	    // Jump
	    nextAddress = instruction & 0x1ff;
	  } else {
	    // Hold address until key pressed or address overflow (TODO)
	    nextAddress = this.model.address;
	  }
	  break;
	case 19: // SFB: set flag B
	  this.writeFlag(this.model.bf, 1);
	  break;
	case 20: // SFA: set flag A
	  this.writeFlag(this.model.af, 1);
	  break;
	case 21: // SYNC (SYNCH): hold address until end of D10
	  if (this.model.dActive != 10) {
	    nextAddress = this.model.address;
	  }
	  this.model.cc = 0;
	  this.model.ccMeaning = '';
	  break;
	case 22: // SCAN (SCANNO): wait for key
	  this.model.display = 1; // Reset display power off latch
	  if (this.model.keyStrobe) {
	    this.model.cc = 1;
	    this.model.ccMeaning = 'key';
	  } else {
	    this.model.cc = 0;
	    this.model.ccMeaning = 'no key';
	    if (this.model.dActive != 10) {
	      // Hold address until end of D10
	      nextAddress = this.model.address;
	    }
	  }
	  break;
	case 23: // ZFB: zero flag B
	  this.writeFlag(this.model.bf, 0);
	  break;
	case 24: // ZFA: zero flag A
	  this.writeFlag(this.model.af, 0);
	  break;
	case 25: // TFB: test flag B
	  this.testFlag(this.model.bf);
	  break;
	case 26: // TFA: test flag A
	  this.testFlag(this.model.af);
	  break;
	case 27: // FFB: flip flag B
	  this.writeFlag(this.model.bf, -1 /* flip */);
	  break;
	case 28: // FFA: flip flag A
	  this.writeFlag(this.model.af, -1 /* flip */);
	  break;
	case 29: // CF: compare flags
	  this.compareFlags(this.model.af, this.model.bf);
	  break;
	case 30: // NOP
	  break;
	case 31: // EXF: exchange flags
	  this.exchange(this.model.af, this.model.bf);
	  break;
	default:
	  alert('Bad instruction ' + instruction);
	  break;
      }
    } else if (classBits == 0) {
      // jump if reset: BIU, BIZ, BIGE, BINC, BIE, BET
      if (this.model.cc == 0) {
	nextAddress = instruction & 0x1ff;
      }
      this.model.cc = 0; // Clear after jump
      this.model.ccMeaning = '';
    } else if (classBits == 1) {
      // jump if set: BID, BIO, BILT, BIC, BINE
      if (this.model.cc == 1) {
	nextAddress = instruction & 0x1ff;
      }
      this.model.cc = 0; // Clear after jump
      this.model.ccMeaning = '';
    } else if ((instruction >> 7) == 8) {
      // Jump if key down on KO (BKO)
      if (this.model.keyStrobe == 'KO') {
	nextAddress = instruction & 0x1ff;
      }
      this.model.cc = 0; // Clear after jump
      this.model.ccMeaning = '';
    } else if ((instruction >> 7) == 9) {
      // Jump if key down on KP (BKP)
      if (this.model.keyStrobe == 'KP') {
	nextAddress = instruction & 0x1ff;
      }
      this.model.cc = 0; // Clear after jump
      this.model.ccMeaning = '';
    } else {
      alert('Bad instruction code ' + instruction);
    }
    this.model.address = nextAddress;
    // Put the mask for the next instruction in the model for display
    this.model.mask = this.getMask();
    // Update D state
    this.updateD();
  };

  this.add = function(src1, src2, dst, hex) {
    var carry = 0;
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	var result = src1[i] + src2[i] + carry;
	if (!hex && result >= 10) {
	  result -= 10;
	  carry = 1;
	} else if (hex && result >= 16) {
	  result -= 16;
	  carry = 1;
	} else {
	  carry = 0;
	}
	dst[i] = result;
      }
    }
    if (carry) {
      this.model.cc = carry;
      this.model.ccMeaning = carry ? 'overflow' : 'no overflow';
    }
  };

  this.sub = function(src1, src2, dst, hex) {
    var borrow = 0;
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	var result = src1[i] - src2[i] - borrow;
	if (result < 0) {
	  result += hex ? 16 : 10;
	  borrow = 1;
	} else {
	  borrow = 0;
	}
	dst[i] = result;
      }
    }
    if (borrow) {
      this.model.cc = borrow;
      this.model.ccMeaning = borrow ? 'borrow' : 'no borrow';
    }
  };

  this.compare = function(src1, src2) {
    this.sub(src1, src2, []);
    // Compare sets condition if not borrow
    this.model.ccMeaning = this.model.cc ? "less than" : "not less than";
  };

  this.copy = function(src, dst) {
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	dst[i] = src[i];
      }
    }
  };

  this.sll = function(src) {
    var maskVec = this.getMask();
    var digit = 0;
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	var newdigit = src[i];
	src[i] = digit;
	digit = newdigit;
      }
    }
  };

  this.srl = function(src) {
    var maskVec = this.getMask();
    var digit = 0;
    for (var i = 0; i <= 10; i++) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	var newdigit = src[i];
	src[i] = digit;
	digit = newdigit;
      }
    }
  };

  this.writeFlag = function(dest, val) {
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
        // Flip dst if val == -1, otherwise set to val
        dest[i] = (val < 0) ? (1 - dest[i]) : val;
      }
    }
  };

  this.compareFlags = function(src1, src2) {
    var cc = 0;
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	if (src1[i] != src2[i]) {
	  cc = 1;
	}
      }
    }
    if (cc) {
      this.model.cc = 1;
      this.model.ccMeaning = 'flags not equal';
    }
  };

  this.exchange = function(src1, src2) {
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	var t = src1[i];
	src1[i] = src2[i];
	src2[i] = t;
      }
    }
  };

  this.testFlag = function(src) {
    var cc = 0;
    var maskVec = this.getMask();
    for (var i = 10; i >= 0; i--) {
      if (maskVec[i] === ' ') {
	// masked out
	continue;
      } else {
	if (src[i]) {
	  cc = 1;
	}
      }
    }
    /* Only update cc if bit set */
    if (cc) {
      this.model.cc = cc;
      this.model.ccMeaning = 'flag set';
    }
  };

  this.updateD = function() {
    var d10 = this.model.d.splice(9, 1)[0];
    this.model.d.splice(0, 0, d10);
    this.model.dActive += 1;
    if (this.model.dActive > 10) {
      this.model.dActive = 1;
    }
  }
};
