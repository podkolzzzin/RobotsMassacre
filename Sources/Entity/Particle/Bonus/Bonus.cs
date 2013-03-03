using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Level;
using Gfx;
using Robots_Massacre_Client;

namespace Entity.Particle.Bonus
{
    public enum BonusType
    {
        Acceleration = 128,
        APBullets = 129,
        BigAmmo = 130,
        BigMedChest = 131,
        DispenserBonus = 132,
        Invulnerability = 133,
        MineBonus = 134,
        SmallAmmo = 135,
        SmallMedChest = 136,
        TurretBonus = 137,
        Unknown = 0
    }

    public class Bonus : Particle
    {
        public bool Used = false;
        public bool Active = false;
        public bool LifeSpanExpired = false;

        private int Duration = 0;
        private long ActivationTime = 0;

        public virtual bool ForInventory { get { return false; } }
        public virtual int ImageIndex { get { return 0; } }
        public override int Type { get { return (int)BonusType.Unknown; } }

        public override bool CanPass { get { return false; } }

        public Bonus(int x, int y)
            : base(x, y, 30, 30, 2500)
        {
            this.Owner = -1;
        }

        public Bonus(int x, int y, int duration)
            : base(x, y, 30, 30, 2500)
        {
            this.Duration = duration;
            this.Owner = -1;
        }

        public override void Update()
        {
            if (Living++ > LifeTime)
            {
                LifeSpanExpire();
            }
        }

        public override void Render(GBitmap screen)
        {
			screen.Blit(Art.GRAPHICS[ImageIndex, 19], iX, iY);
        }

        public void LifeSpanExpire() {
            LifeSpanExpired = true;
        }

        public int GetDuration()
        {
            return Duration;
        }

        public long GetActivationTime()
        {
            return ActivationTime;
        }

        public int GetLifeSpan()
        {
            return (int)(Program.GetCurrentTimeMillis() - ActivationTime);
        }

        public void CheckUsing()
        {
            if (GetLifeSpan() > GetDuration())
            {
                Active = false;
                Used = true;
            }
        }

		public void Renew(int playerId)
        {
			Use(playerId);
        }

        public virtual void PickUp(int playerId)
        {
			Use(playerId);
        }

        public virtual void Use(int playerId)
        {
            Active = true;
            ActivationTime = Program.GetCurrentTimeMillis();
        }

        public override string ToString()
        {
            return "bonus";
        }

        // =================
        // Simple Static API

        public static Bonus[] GetFullBonusList()
        {
            return new Bonus[] {
                new Acceleration(0, 0), new APBullets(0, 0), new BigAmmo(0, 0),
                new BigMedChest(0, 0), new Invulnerability(0, 0), new MineBonus(0, 0),
                new SmallAmmo(0, 0), new SmallMedChest(0, 0), new TurretBonus(0, 0),
                new DispenserBonus(0, 0)
            };
        }

        public static Bonus FindBonus(string Name)
        {
            Bonus B = new Bonus(0, 0); // In other words, it is not neither active or used
            foreach (Bonus tB in GameLevel.CurrentPlayer.PickedBonuses)
            {
                if (tB.ToString().Equals(Name))
                {
                    B = tB;
                    break;
                }
            }
            return B;
        }

        public static bool IsImmortalA()
        {
            return FindBonus("invulnerability").Active;
        }

        public static bool IsAPBulletsA()
        {
            return FindBonus("ap-bullets").Active;
        }

        public static bool IsAccelerationA()
        {
            return FindBonus("acceleration").Active;
        }
    }
}