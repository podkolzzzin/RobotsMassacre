using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Level;

namespace Inventory
{
    public class CannonInv : InvItem
    {
        public override int ImageIconIndex { get { return 9; } }
        public override int ActivationKey { get { return 1; } }

		public override InvType Type { get { return InvType.Cannon; } }

        public override void Use(int playerId)
        {
            GameLevel.CurrentPlayer.Shoot();
        }

        public override string ToString()
        {
            return "inventory-cannon";
        }
    }
}